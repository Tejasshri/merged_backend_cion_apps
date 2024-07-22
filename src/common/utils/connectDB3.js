const { MongoClient } = require("mongodb");
const mysql = require("mysql2");
const { Client } = require("ssh2");
const fs = require("fs");
const util = require("util");

let mongoDB;
let pool;

// MongoDB Connection Function (Your existing function)
const connectMongoDB = async () => {
  try {
    if (mongoDB) {
      console.log("Returning existing MongoDB connection");
      return mongoDB;
    }

    const mongoClient = new MongoClient(
      "mongodb://tejas:tejas1122@127.0.0.1:27017/admin?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.2.9"
    );

    await mongoClient.connect();
    mongoDB = mongoClient.db("test");
    console.log("MongoDB connected");
    return mongoDB;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
};

// SSH Configuration for MySQL
const sshConfig = {
  host: "43.205.43.32",
  port: 22,
  username: "bitnami",
  privateKey: fs.readFileSync("src/common/utils/cancerclinicNew.pem"), // Adjust the path to your SSH private key file
};
console.log(sshConfig);

// MySQL Database Configuration
const dbConfig = {
  host: "43.205.43.32",
  port: 22,
  user: "bn_wordpress",
  password: process.env.NEW_SQL_PASSWORD, // Replace with actual MySQL password from vault
  database: process.env.NEW_SQL_DATABASE, // Replace with actual database name
};

// Function to set up SSH tunnel for MySQL
const setupSSHConnection = () => {
  return new Promise((resolve, reject) => {
    const sshClient = new Client();
    sshClient
      .on("ready", () => {
        sshClient.forwardOut(
          "127.0.0.1",
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
      })
      .connect(sshConfig);

    sshClient.on("error", (err) => {
      reject(err);
    });
  });
};

// MySQL Pool Creation Function
const createPool = async () => {
  const stream = await setupSSHConnection();
  pool = mysql.createPool({
    ...dbConfig,
    connectionLimit: 1,
    connectTimeout: 10000,
    queueLimit: 1000,
    waitForConnections: true,
    stream,
  });

  pool.query = util.promisify(pool.query);
};

// Function to Connect to MySQL and Execute a Query
const connectSqlDBAndExecute = async (query) => {
  try {
    if (!pool) await createPool();
    const results = await pool.query(query);
    console.log("Query results:", results);
    return results;
  } catch (error) {
    console.error("SQL Database Connection Error:", error.message);
    throw error;
  }
};

module.exports = { connectMongoDB, connectSqlDBAndExecute };
