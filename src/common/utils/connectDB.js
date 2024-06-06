const { MongoClient } = require("mongodb");
const fs = require("fs").promises; // Use promise-based file system operations
const path = require("path");
const mysql = require("mysql");

let [mongoDB, pool] = [];

let connectMongoDB = async (routerName = "") => {
  try {
    if (mongoDB) {
      console.log("Retured this");
      return mongoDB;
    }
    const client = new MongoClient(
      "mongodb+srv://cionchat:Cionchat%401234@cluster0.xliikxl.mongodb.net/"
    );

    await client.connect(); // Properly connect the client
    const db = await client.db("test");
    console.log("DATABASE connected " + routerName);
    mongoDB = db;
    return mongoDB;
  } catch (error) {
    console.error(error);
    res.status(500).send("Error connecting to the database");
  }
};


const connectSqlDB = async (message) => {
  if (pool) return pool;

  pool = mysql.createPool({
    connectionLimit: 10, // Adjust the limit as needed
    host: process.env.SQL_HOST,
    database: process.env.SQL_DATABASE,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    port: process.env.SQL_PORT,
  });

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error connecting to SQL database: " + err.stack);
      return;
    }
    if (connection) connection.release(); // Release the connection back to the pool
    console.log("SQL Database Connected: " + message);
  });

  return pool;
};

module.exports = { connectMongoDB, connectSqlDB };
