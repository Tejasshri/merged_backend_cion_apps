const { MongoClient } = require("mongodb");
const mysql = require("mysql2");
const util = require("util");
const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");

let mongoDB;
let pool;
let sshClient;

// MongoDB Connection Function
const connectMongoDB = async (routerName = "") => {
  try {
    if (mongoDB) {
      console.log("Returning existing MongoDB connection");
      return mongoDB;
    }

    const mongoClient = new MongoClient(
      "mongodb+srv://cionchat:Cionchat%401234@cluster0.xliikxl.mongodb.net/"
    );

    await mongoClient.connect();
    mongoDB = mongoClient.db("test");
    console.log("MongoDB connected: " + routerName);
    return mongoDB;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
};

// MySQL Pool Creation Function with SSH Tunneling

const dbServer = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

const createPool = async () => {
  try {
    if (!pool) {
      const tunnelConfig = {
        host: process.env.DB_SSH_HOST,
        port: 22,
        username: process.env.DB_SSH_USER,
        privateKey: fs.readFileSync(path.join(__dirname, "ssh_key.pem")),
      };

      const forwardConfig = {
        srcHost: "127.0.0.1",
        srcPort: 3306,
        dstHost: dbServer.host,
        dstPort: dbServer.port,
      };

      // Establish SSH tunnel
      sshClient = new Client();
      await new Promise((resolve, reject) => {
        sshClient
          .on("ready", () => {
            sshClient.forwardOut(
              forwardConfig.srcHost,
              forwardConfig.srcPort,
              forwardConfig.dstHost,
              forwardConfig.dstPort,
              (err, stream) => {
                if (err) reject(err);

                pool = mysql.createPool({
                  ...dbServer,
                  stream, // Use the SSH stream for connection
                });

                // Promisify the pool methods
                pool.getConnection = util.promisify(pool.getConnection);
                pool.query = util.promisify(pool.query);

                console.log("MySQL pool with SSH tunnel connected");
                resolve();
              }
            );
          })
          .on("error", (err) => {
            console.error("SSH tunnel connection error:", err);
            reject(err);
          })
          .connect(tunnelConfig);
      });
    }
  } catch (error) {
    console.error("Error creating MySQL pool with SSH tunnel:", error);
    throw error;
  }
};

// Function to connect to SQL DB through SSH and execute query
const connectSqlDBAndExecute = async (query) => {
  let connection;
  try {
    if (!pool) await createPool(); // Ensure pool is initialized

    connection = await pool.getConnection(); // Obtain a connection from the pool
    console.log("Connection successful " + connection.threadId);

    connection.query = util.promisify(connection.query); // Promisify query method

    const results = await connection.query(query); // Execute the query
    console.log("Query results:", results);
    return results;
  } catch (error) {
    console.error("SQL Database Connection Error: ", error.message);

    // Handle specific error codes or scenarios
    if (error.code === "ER_NET_PACKETS_OUT_OF_ORDER" || error.code === "ER_USER_LIMIT_REACHED") {
      console.error("Retrying connection...");
      await reconnectMySQL(); // Retry connection
    } else {
      throw error; // Re-throw other errors for higher level handling
    }
  } finally {
    // Ensure connection is released back to the pool
    if (connection) {
      connection.release(); // Release the connection back to the pool
      console.log("Released connection " + connection.threadId);
    }
  }
};

// Function to handle reconnection attempts for MySQL
const reconnectMySQL = async () => {
  try {
    await pool.end(); // End the pool to release all connections
    pool = undefined; // Reset pool to force re-creation
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second
    await createPool(); // Re-create the pool and establish SSH tunnel
  } catch (error) {
    console.error("Error reconnecting MySQL:", error);
    throw error;
  }
};

// Function to disconnect SSH tunnel
const disconnectSSH = () => {
  if (sshClient && sshClient.end) {
    sshClient.end();
    console.log("SSH tunnel disconnected");
  }
};

module.exports = {
  connectMongoDB,
  connectSqlDBAndExecute,
  createPool,
  disconnectSSH,
};
