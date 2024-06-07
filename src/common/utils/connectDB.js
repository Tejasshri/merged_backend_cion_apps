const { MongoClient } = require("mongodb");
const mysql = require("mysql");
const util = require("util");

let mongoDB;
let mongoClient; // Store the MongoClient instance
let pool;

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


const createPool = () => {
  pool = mysql.createPool({
    connectionLimit: 10, // Adjust the limit as needed
    host: process.env.SQL_HOST,
    database: process.env.SQL_DATABASE,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    port: process.env.SQL_PORT,
    connectTimeout: 5000, // Connect timeout in milliseconds
  });

  // Promisify for Node.js async/await.
  pool.getConnection = util.promisify(pool.getConnection);
};

const connectSqlDB = async (message) => {
  try {
    if (!pool) {
      createPool();
    }

    const attemptConnection = async (retries = 5) => {
      try {
        const connection = await pool.getConnection();
        console.log("Connection successful");
        connection.release(); // Release the connection back to the pool
      } catch (err) {
        if (err.code === 'ER_USER_LIMIT_REACHED' && retries > 0) {
          console.error(`User limit reached, retrying connection in 5 seconds... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          return attemptConnection(retries - 1);
        } else {
          console.error("Error connecting to SQL database:", err.message);
          throw err; // re-throw the error after logging it
        }
      }
    };

    await attemptConnection();
    console.log("SQL Database Connected: " + message);

    return pool;
  } catch (error) {
    console.error("Failed to connect to SQL database after multiple attempts:", error.message);
    throw error; // re-throw the error after logging it
  }
};


module.exports = { connectMongoDB, connectSqlDB };
