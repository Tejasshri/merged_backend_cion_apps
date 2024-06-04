const { MongoClient } = require("mongodb");
const fs = require("fs").promises; // Use promise-based file system operations
const path = require("path");
const mysql = require("mysql");

let connectMongoDB = async (routerName = "") => {
  try {
    const uploadsFolderPath = path.join(__dirname, "uploads");

    // Check if the uploads folder exists and create it if it doesn't
    try {
      await fs.access(uploadsFolderPath);
    } catch (error) {
      await fs.mkdir(uploadsFolderPath);
      console.log("Uploads folder created successfully.");
    }
    const client = new MongoClient(
      "mongodb+srv://cionchat:Cionchat%401234@cluster0.xliikxl.mongodb.net/"
    );

    await client.connect(); // Properly connect the client
    const db = client.db("test");
    // Remember to close the client when done
    // await client.close();
    console.log("DATABASE connected " + routerName);
    return db;
  } catch (error) {
    console.error(error);
    res.status(500).send("Error connecting to the database");
  }
};

let connectSqlDB = async (routerName = "") => {
  const connection = mysql.createConnection({
    host: "bavbwnskgspsg4hoezuh-mysql.services.clever-cloud.com",
    database: "bavbwnskgspsg4hoezuh",
    user: "uvwarr5nxly8rt9h",
    password: "ePWGgtAiz9G7TIylKiPD",
    port: 3306,
  });
  try {
    connection.connect((err) => {
      try {
        if (err) {
          console.error("Error connecting to database: " + err.stack);
          return;
        }
        console.log("Connected to database as id " + connection.threadId);
      } catch (err) {
        console.log(err);
      }
    });
    console.log("Sql DB connected " + routerName);
    return connection;
  } catch (error) {
    console.log("Error in connection sql DB" + error.message);
  } finally {
    // connection.end();
  }
};

module.exports = { connectMongoDB, connectSqlDB };
