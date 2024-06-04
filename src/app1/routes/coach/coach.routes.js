// --- Written By Tejas --- //

const { Router } = require("express");
const bcrypt = require("bcryptjs");
const { sign, verify } = require("jsonwebtoken");
const { connectMongoDB } = require("../../../common/utils/connectDB.js");
const userAuthentication = require("../../../common/middlewares/auth.middleware.js");

let mongoDB;
// Function to connect to MongoDB
const startDb = async () => {
  try {
    mongoDB = await connectMongoDB();
  } catch (error) {
    console.log(error.message);
  }
};
startDb();

const coachRouter = Router();
// Endpoint to get coach's patient list

// Endpoint to get coach details
coachRouter.post("/get-coach", userAuthentication, async (req, res) => {
  try {
    const { email, username } = req;
    const collection = await mongoDB.collection("coaches");
    if (username) {
      res.json({ data: { coachName: username } });
    } else {
      res.status(404).json({ message: "Coach not found" });
    }
  } catch (error) {
    console.error("Error getting coach details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Endpoint to register a new coach
coachRouter.post("/register", async (req, res) => {
  try {
    const collection = await mongoDB.collection("coaches");
    const { username, email, password } = req.body;

    console.log(username, email, password);
    if (!username || !email || !password)
      return res.status(400).json({ msg: "Data cannot be empty", status: 400 });

    const isCoachExists = await collection.findOne({ username });
    if (isCoachExists)
      return res.status(400).json({ msg: "User Already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const coach = {
      username,
      email,
      password: hashedPassword,
    };

    await collection.insertOne(coach);
    res.status(201).json({ msg: "Coach Created", status: 201 });
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "Something Went Wrong", status: 400 });
  }
});

// Endpoint to login a coach
coachRouter.post("/login", async (req, res) => {
  try {
    const { password, username } = req.body;
    console.log(password, username);

    if (username === "")
      return res.status(401).json({ msg: "Username is empty" });
    else if (password === "")
      return res.status(401).json({ msg: "Password is empty" });

    const collection = await mongoDB.collection("coaches");
    const isUserExists = await collection.findOne({ username });

    if (isUserExists) {
      const isPasswordMatched = await bcrypt.compare(
        password,
        isUserExists.password
      );
      if (isPasswordMatched) {
        let payload = { username, password, email: isUserExists.email };
        console.log(payload);
        let token = sign(payload, process.env.TOKEN_SECRET_KEY);
        res.send({ msg: "Login Success", token });
      } else {
        res.status(400).send({ msg: "Wrong password" });
      }
    } else {
      res.status(401).send({ msg: "Invalid user" });
    }
  } catch (error) {
    console.log(error);
    res.send({ msg: error.message });
  }
});

// Endpoint to delete a coach account
coachRouter.post("/delete-account", userAuthentication, async (req, res) => {
  try {
    const { username, email } = req;
    if (username === "")
      return res.status(401).json({ msg: "Username is empty" });

    const collection = await mongoDB.collection("coaches");
    const isUserExists = await collection.findOne({ username });

    if (isUserExists) {
      await collection.deleteOne({ username });
      res.status(200).json({ msg: "Deleted Successfully" });
    } else {
      res.status(400).send({ msg: "User not exists" });
    }
  } catch (error) {
    console.log(error);
    res.send({ msg: error.message });
  }
});

coachRouter.post("/verify", userAuthentication, async (req, res) => {
  res.status(201).json({ msg: "Verified" });
});

exports.coachRouter = coachRouter;
