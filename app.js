// --- Written By Tejas --- //
const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const app = express();
const server = createServer(app);

// Importing Router
const { coachRouter } = require("./src/app1/routes/coach/coach.routes.js");
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
const { connectSqlDB } = require("./src/common/utils/connectDB.js");

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

let connection;
connectSqlDB()
  .then((r) => (connection = r))
  .catch((err) => console.log(err));

const io = initSocketServer(server);
app.use((req, res, next) => {
  res.io = io;
  console.log("Io included in response");
  next(); // Ensure the request continues through the middleware chain
});

// Defining Router App1
app.use("/", pagesRouter);
app.use("/app1/coach", coachRouter); // Mount coachRouter under /app1
app.use(webhookPatientRouter); // Mount patientRouter //
app.use("/app1/patient", patientRouter);

// Defining Router App2
app.use("/app2/patient", crmPatientRouter);

module.exports = server;
// --- Written By Tejas --- //
