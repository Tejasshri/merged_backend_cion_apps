// --- Written By Tejas --- //

const { Router } = require("express");
const bcrypt = require("bcryptjs");
const { sign, verify } = require("jsonwebtoken");
const userAuthentication = require("../../middlewares/auth.middleware.js");
const { connectSqlDBAndExecute } = require("../../utils/connectDB.js");

const coachRouter = Router();
// Endpoint to get coach's patient list

// Endpoint to get coach details
coachRouter.post("/get-coach", userAuthentication, async (req, res) => {
  try {
    const { username } = req;
    let query = `SELECT * FROM users WHERE username = "${username}"`;
    const userArray = await connectSqlDBAndExecute(query);
    if (userArray.length === 0) {
      res.status(400).send({ msg: "Not Found" });
    } else if (userArray || userArray[0].username) {
      console.log(userArray[0].username);
      res.status(201).send({ data: { coachName: userArray[0].username } });
    }
  } catch (error) {
    console.error("Error getting coach details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Endpoint to register a new coach
coachRouter.post("/register", async (req, res) => {
  const { connectSqlDBAndExecute } = req;
  try {
    const { username, email, password } = req.body;
    const query = `SELECT * FROM users WHERE username = '${username}'`;
    const coachArray = await connectSqlDBAndExecute(query);
    const isCoachExists = coachArray[0];

    if (isCoachExists)
      return res.status(400).json({ msg: "User Already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const coach = {
      username,
      email,
      password: hashedPassword,
    };

    // await collection.insertOne(coach);
    console.log(coach);
    const insertUserQuery = `INSERT INTO users
            (email,password,username) 
            VALUES('${coach.email}','${coach.password}','${coach.username}')`;
    await connectSqlDBAndExecute(insertUserQuery);
    return res.status(201).json({ msg: "Coach Created", status: 201 });
  } catch (error) {
    console.log(error);
    res
      .status(400)
      .json({ msg: "Something Went Wrong" + error.message, status: 400 });
  } finally {
  }
});

// Endpoint to login a coach
coachRouter.post("/login", async (req, res) => {
  try {
    const { password, username } = req.body;
    if (username === "")
      return res.status(401).json({ msg: "Username is empty" });
    else if (password === "")
      return res.status(401).json({ msg: "Password is empty" });
    const query = `SELECT * FROM users WHERE username = '${username}'`;
    const result = await connectSqlDBAndExecute(query);
    if (result.length !== 0) {
      const isPasswordMatched = await bcrypt.compare(
        password,
        result[0].password
      );
      if (isPasswordMatched) {
        let payload = { username, password, email: result[0].email };
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
    const { username, email, mongoDB } = req;
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
