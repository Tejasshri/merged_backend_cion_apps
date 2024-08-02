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
      "mongodb+srv://cionchat:Cionchat%401234@cluster0.xliikxl.mongodb.net/" ||
        "mongodb://tejas:tejas1122@127.0.0.1:27017/admin?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.2.9"
    );

    await mongoClient.connect();
    mongoDB = mongoClient.db("admin");
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
                waitForConnections: true,
                connectionLimit: 1,
                connectTimeout: 60000,
                stream, // Use the SSH stream for connection
              });

              console.log("pool created");

              // Promisify the pool methods
              pool.getConnection = util.promisify(pool.getConnection);
              pool.query = util.promisify(pool.query);

              console.log("MySQL pool with SSH tunnel connected");
              resolve();
            }
          );
        })
        .on("error", (err) => {
          if (err.code === "ECONNRESET") {
            reconnectMySQL();
          } else {
            reject(err);
          }
        })
        .connect(tunnelConfig);
    });
  } catch (error) {
    console.error("Error creating MySQL pool with SSH tunnel:", error);
    throw error;
  }
};

// createPool();

// Function to connect to SQL DB through SSH and execute query
const connectSqlDBAndExecute = async (query) => {
  try {
    if (!pool) await createPool(); // Ensure pool is initialized
    const rows = await pool.query(query);
    return rows;
  } catch (error) {
    console.error("SQL Database Connection Error: ", error.message);
    if (
      error.code === "ER_NET_PACKETS_OUT_OF_ORDER" ||
      error.code === "ER_USER_LIMIT_REACHED" ||
      "ETIMEDOUT" ||
      "PROTOCOL_CONNECTION_LOST"
    ) {
      console.clear();
      console.error("Retrying connection...", error.code);
      await reconnectMySQL(); // Retry connection
    } else {
      console.log(error.message, error.code); // Re-throw other errors for higher level handling
    }
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for 1 second
    return await connectSqlDBAndExecute(query);
  }
};

// Function to handle reconnection attempts for MySQL
const reconnectMySQL = async () => {
  try {
    await pool?.end(); // End the pool to release all connections
    pool = undefined; // Reset pool to force re-creation
    sshClient = undefined;
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second
    await createPool(); // Re-create the pool and establish SSH tunnel
  } catch (error) {
    console.error("Error reconnecting MySQL:", error);
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
