const { MongoClient } = require("mongodb");
const mysql = require("mysql");
const util = require("util");
const { Client } = require('ssh2');
const fs = require('fs');

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
      "mongodb://cion:cion11224@127.0.0.1:27017/admin?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.2.9"
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

// SSH Configuration
const sshConfig = {
  host: '43.205.43.32',
  port: 22,
  username: 'bitnami',
  privateKey: fs.readFileSync('C:/Users/tejas/OneDrive/Documents/CION/ourCionApps/backend/src/common/utils/cancerclinicNew.pem')  // Adjust the path as needed
};

// MySQL Database Configuration
const dbConfig = {
  host: '127.0.0.1',
  port: 3306,
  user: 'bn_wordpress',
  password: process.env.NEW_SQL_PASSWORD,  // Replace with actual MySQL password
  database: process.env.NEW_SQL_DATABASE  // Replace with actual database name
};

// SSH Client Setup
const setupSSHConnection = () => {
  return new Promise((resolve, reject) => {
    sshClient = new Client();
    sshClient.on('ready', () => {
      sshClient.forwardOut(
        '127.0.0.1',
        3306,
        dbConfig.host,
        dbConfig.port,
        (err, stream) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(stream);
        }
      );
    }).connect(sshConfig);

    sshClient.on('error', (err) => {
      reject(err);
    });
  });
};

// MySQL Pool Creation Function
const createPool = async () => {
  const stream = await setupSSHConnection();
  pool = mysql.createPool({
    ...dbConfig,
    connectionLimit: 5,
    connectTimeout: 10000,
    queueLimit: 1000,
    waitForConnections: true,
    stream
  });

  pool.getConnection = util.promisify(pool.getConnection);
  pool.query = util.promisify(pool.query);
};

// Function to Connect to MySQL and Execute a Query
const connectSqlDBAndExecute = async (query) => {
  let connection;
  try {
    if (!pool) await createPool(); // Create pool if not already exists
    connection = await pool.getConnection(); // Obtain a connection
    console.log("Connection successful " + connection.threadId);
    connection.query = util.promisify(connection.query); // Promisify query method
    const results = await connection.query(query); // Execute the query
    console.log("Query results:", results);
    return results;
  } catch (error) {
    console.error("SQL Database Connection Error: ", error.message);
    // Handle specific error codes
    if (error.code === "ER_USER_LIMIT_REACHED") {
      console.error("User limit reached, trying to free up a connection...");
      await pool.end(); // End the pool to release all connections
      pool = undefined; // Reset pool to force re-creation

      console.error("Retrying connection...");
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second
      return await connectSqlDBAndExecute(query); // Retry connection
    } else {
      console.error("Error:", error); // Log other errors
      throw error; // Re-throw the error for higher level handling
    }
  } finally {
    // Ensure connection is released back to the pool
    if (connection) {
      try {
        connection.release(); // Release the connection
        console.log("Released connection " + connection.threadId);
      } catch (e) {
        console.error("Error releasing connection:", e);
      }
    }
  }
};

module.exports = { connectMongoDB, connectSqlDBAndExecute, createPool };
