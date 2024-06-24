const { Router, static } = require("express");
const path = require("path");
const { connectMongoDB } = require("../../utils/connectDB.js");

const pagesRouter = Router();

const buildPath = path.join(__dirname, "../../../../build");

// Middleware to serve static files
pagesRouter.use(static(buildPath));

// Routes to serve HTML files

pagesRouter.get(
  [
    "/login",
    "/chat_app",
    "/leadgen_app/dashboard",
    "/leadgen_app/allleads",
    "/leadgen_app/patient",
    "/leadgen_app/day-wise-followups", 
  ],
  (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"), (err) => {
      if (err) {
        console.error("Error serving", err.message);
        res.status(500).send("Internal Server Error");
      }
    });
  }
);

// pagesRouter.get("/app", (req, res) => {
//   res.sendFile(path.join(buildPath, "index.html"), (err) => {
//     if (err) {
//       console.error("Error serving /app:", err.message);
//       res.status(500).send("Internal Server Error");
//     }
//   });
// });

// pagesRouter.get("/dashboard", (req, res) => {
//   res.sendFile(path.join(buildPath, "index.html"), (err) => {
//     if (err) {
//       console.error("Error serving /dashboard:", err.message);
//       res.status(500).send("Internal Server Error");
//     }
//   });
// });

// pagesRouter.get("/allleads", (req, res) => {
//   res.sendFile(path.join(buildPath, "index.html"), (err) => {
//     if (err) {
//       console.error("Error serving /allleads:", err.message);
//       res.status(500).send("Internal Server Error");
//     }
//   });
// });

// pagesRouter.get("/patient/:id", (req, res) => {
//   res.sendFile(path.join(buildPath, "index.html"), (err) => {
//     if (err) {
//       console.error(`Error serving /patient/${req.params.id}:`, err.message);
//       res.status(500).send("Internal Server Error");
//     }
//   });
// });

// pagesRouter.get("/day-wise-followups", (req, res) => {
//   res.sendFile(path.join(buildPath, "index.html"), (err) => {
//     if (err) {
//       console.error(
//         `Error serving /day-wise-followups${req.params.id}:`,
//         err.message
//       );
//       res.status(500).send("Internal Server Error");
//     }
//   });
// });

exports.pagesRouter = pagesRouter;
