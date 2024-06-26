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

// MySQL Connection and Query Execution Function
const connectSqlDBAndExecute = async (query) => {
  try {
    if (!pool) await createPool();
    connection = await pool.getConnection();
    console.log("Connection successful " + connection.threadId);

    connection.query = util.promisify(connection.query);

    try {
      const results = await connection.query(query);
      console.log("Query results:", results);
      return results;
    } finally {
      connection.release();
      console.log("Released connection " + connection.threadId);
    }
  } catch (error) {
    console.error("SQL Database Connection Error: ", error.message);

    if (error.code === "ER_USER_LIMIT_REACHED") {
      console.error("User limit reached, trying to free up a connection...");
      await pool.end((err) => {
        if (err) {
          console.error("Error closing pool:", err);
        } else {
          console.log("Pool closed successfully");
        }
      });

      pool = undefined; // Reset the pool to force re-creation

      console.error("Retrying connection...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return await connectSqlDBAndExecute(query);
    } else {
      throw error; // Re-throw error if it's not a connection limit error
    }
  }
};

module.exports = { connectMongoDB, connectSqlDBAndExecute, createPool };
