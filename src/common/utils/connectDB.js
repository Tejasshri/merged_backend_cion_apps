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

    // Promisify the query method for this connection
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
    await pool?.end((err) => {
      if (err) {
        console.error("Error closing pool:", err);
      } else {
        console.log("Pool closed successfully");
      }
      pool = undefined;
    });

    console.error("Retrying connection...");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return await connectSqlDBAndExecute(query);
  }
};

module.exports = { connectMongoDB, connectSqlDBAndExecute, createPool };

// SELECT
// 	 roles.id, roles.name as role, roles_capability.capability_id,
//     capability.name AS capability_name, feature_capability.permissions,
//     features.name AS feature
// FROM
// 	((((roles INNER JOIN roles_capability ON roles.id = roles_capability.role_id)
//     INNER JOIN capability ON capability.id = roles_capability.capability_id)
//     INNER JOIN feature_capability ON roles_capability.id = feature_capability.feature_id)
//     INNER JOIN features ON features.id = feature_capability.feature_id )

// 	;
