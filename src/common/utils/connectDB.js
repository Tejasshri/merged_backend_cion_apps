const { MongoClient } = require("mongodb");
const mysql = require("mysql");
const util = require("util");

let mongoDB;
let mongoClient; // Store the MongoClient instance
let pool;
let connection;

const connectMongoDB = async (routerName = "") => {
  try {
    if (mongoDB) {
      console.log("Returning existing MongoDB connection");
      return mongoDB;
    }

    mongoClient = new MongoClient(
      "mongodb+srv://cionchat:Cionchat%401234@cluster0.xliikxl.mongodb.net/"
    );

    await mongoClient.connect(); // Properly connect the client
    const db = await mongoClient.db("test");
    console.log("MongoDB connected: " + routerName);
    mongoDB = db;
    return mongoDB;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
};

const createPool = async () => {
  pool = mysql.createPool({
    connectionLimit: 10, // Adjust the limit as needed
    host: process.env.SQL_HOST,
    database: process.env.SQL_DATABASE,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    port: process.env.SQL_PORT,
    connectTimeout: 10000, // Increased connect timeout in milliseconds
  });

  // Promisify for Node.js async/await.
  pool.getConnection = util.promisify(pool.getConnection);
};

const connectSqlDBAndExecute = async (query) => {
  try {
    if (!pool) await createPool();
    connection = await pool.getConnection();
    console.log("Connection successful");

    // Promisify the query method for this connection
    connection.query = util.promisify(connection.query);

    // Perform database operation here
    const results = await connection.query(query);
    console.log("Query results:", results);

    // Release the connection back to the pool
    await connection.release();
    console.log("SQL Database Connected: Operation completed successfully");

    return results;
  } catch (error) {
    console.error("SQL Database Connection Error: ", error.message);
    console.error("Trying to connect again ............ ");
    return await connectSqlDBAndExecute(query);
  } 
};

module.exports = { connectMongoDB, connectSqlDBAndExecute, createPool };
