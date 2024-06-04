const { Router, static } = require("express");
const path = require("path");
const { connectMongoDB } = require("../../../common/utils/connectDB.js");

let mongoDB;

// Function to connect to MongoDB
const startDb = async () => {
  try {
    mongoDB = await connectMongoDB("Build Page Router");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
  }
};

startDb();

const pagesRouter = Router();

const buildPath = path.join(__dirname, "../../../../build");

// Middleware to serve static files
pagesRouter.use(static(buildPath));

// Routes to serve HTML files
pagesRouter.get("/app", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"), (err) => {
    if (err) {
      console.error("Error serving /app:", err.message);
      res.status(500).send("Internal Server Error");
    }
  });
});

pagesRouter.get("/dashboard", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"), (err) => {
    if (err) {
      console.error("Error serving /dashboard:", err.message);
      res.status(500).send("Internal Server Error");
    }
  });
});

pagesRouter.get("/allleads", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"), (err) => {
    if (err) {
      console.error("Error serving /allleads:", err.message);
      res.status(500).send("Internal Server Error");
    }
  });
});

pagesRouter.get("/patient/:id", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"), (err) => {
    if (err) {
      console.error(`Error serving /patient/${req.params.id}:`, err.message);
      res.status(500).send("Internal Server Error");
    }
  });
});

pagesRouter.get("/login", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"), (err) => {
    if (err) {
      console.error("Error serving /login:", err.message);
      res.status(500).send("Internal Server Error");
    }
  });
});

exports.pagesRouter = pagesRouter;
