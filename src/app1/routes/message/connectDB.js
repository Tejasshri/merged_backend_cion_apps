const { MongoClient } = require("mongodb");
const mysql = require("mysql");
const util = require("util");

let mongoDB;
let pool;
let connection;

// MongoDB Connection Function
const connectMongoDB = async (routerName = "") => {
  try {
    if (mongoDB) {
      console.log("Returning existing MongoDB connection");
      return mongoDB;
    }

    const mongoClient = new MongoClient(
      "mongodb://root:MBnJJkinE40/@127.0.0.1:27017/admin?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.2.9"
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

// connection.connect(err, (result) => {});

// MySQL Pool Creation Function
const createPool = async () => {
  pool = mysql.createPool({
    connectionLimit: 5,
    host: process.env.SQL_HOST,
    database: process.env.SQL_DATABASE,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    port: process.env.SQL_PORT,
    connectTimeout: 10000,
    queueLimit: 1000,
    waitForConnections: true,
  });

  pool.getConnection = util.promisify(pool.getConnection);
  pool.query = util.promisify(pool.query);
};

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
