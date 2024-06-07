// --- Written By Tejas --- //
const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const app = express();
const server = createServer(app);

// Importing Router
const { coachRouter } = require("./src/common/routes/coach/coach.routes.js");
const {
  webhookPatientRouter,
} = require("./src/app1/routes/patient/webhook.routes.js");
const {
  patientRouter,
} = require("./src/app1/routes/patient/patient.routes.js");
const {
  patientRouter: crmPatientRouter,
} = require("./src/app2/routes/patient/patient.routes.js");
const { pagesRouter } = require("./src/app1/routes/pages/pages.routes.js");
const { initSocketServer } = require("./src/common/utils/socketIo.js");

// Enabling Cors
app.use(cors());
app.use(express.json());

// SQL DB
const {
  connectSqlDB,
  connectMongoDB,
} = require("./src/common/utils/connectDB.js");

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

connectMongoDB();
connectSqlDB();

const bindDb = async (req, res, next) => {
  let sqlDB = await connectSqlDB("Sql Again Started");
  let mongoDB = await connectMongoDB("MongoDb Again Conncted");

  if (!sqlDB || !mongoDB)
    return res.status(500).json({ msg: "Internal Server Error" });

  req.mongoDB = mongoDB;
  req.sqlDB = sqlDB;
  next();
};

// (async function () {
//   try
//     let sqlDB = await connectSqlDB("Sql Started");
//     let mongoDB = await connectMongoDB("MongoDB Started");
//     app.use(async (req, res, next) => {
//       if (!sqlDB) {
//         sqlDB = await connectSqlDB("Sql Again Started");
//       }
//       if (!mongoDB) {
//         mongoDB = await connectMongoDB("MongoDb Again Conncted");
//       }

//       console.log("Middleware SQL DB:", typeof sqlDB);
//       console.log("Middleware MongoDB:", typeof mongoDB);

//       req.mongoDB = mongoDB;
//       req.sqlDB = sqlDB;
//       next();
//     });
//   } catch (error) {
//     console.log(`Error in database starting ${error.message}`);
//   }
// })();

const io = initSocketServer(server);
app.use((req, res, next) => {
  res.io = io;
  console.log("Io included in response");
  next(); // Ensure the request continues through the middleware chain
});

// Defining Router App1
app.use("/", pagesRouter);
app.use("/app1/coach", bindDb, coachRouter); // Mount coachRouter under /app1
app.use(bindDb, webhookPatientRouter); // Mount patientRouter //
app.use("/app1/patient", bindDb, patientRouter);

// Defining Router App2
app.use("/app2/patient",bindDb, crmPatientRouter);

module.exports = server;
// --- Written By Tejas --- //
