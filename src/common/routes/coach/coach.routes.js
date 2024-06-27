// --- Written By Tejas --- //

const { Router } = require("express");
const bcrypt = require("bcryptjs");
const { sign, verify } = require("jsonwebtoken");
const userAuthentication = require("../../middlewares/auth.middleware.js");
const { connectSqlDBAndExecute } = require("../../utils/connectDB.js");
const { groupByRole } = require("../../utils/groupByRoles.js");

const coachRouter = Router();
// Endpoint to get coach's patient list

// Endpoint to get coach details
coachRouter.post("/get-coach", userAuthentication, async (req, res) => {
  try {
    const { username } = req;
    let query = `SELECT  username, role_id FROM users WHERE username = "${username}"`;
    const userArray = await connectSqlDBAndExecute(query);
    if (userArray.length === 0) {
      res.status(400).send({ msg: "Not Found" });
    } else if (userArray || userArray[0].username) {
      let appUserData = userArray[0];
      console.clear();
      console.table(appUserData);
      res.status(201).send({ data: appUserData });
    }
  } catch (error) {
    console.error("Error getting coach details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Endpoint to get coach details
coachRouter.post("/get-coach-list", userAuthentication, async (req, res) => {
  try {
    console.log("Hitted");
    const { username } = req;
    let query = `SELECT username, role_id FROM users`;
    const userArray = await connectSqlDBAndExecute(query);
    if (userArray.length === 0) {
      res.status(400).send({ msg: "Not Found" });
    } else if (userArray) {
      console.log(userArray);
      res.status(201).send({ data: userArray });
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
        const user = await connectSqlDBAndExecute(query);
        const permissions = await connectSqlDBAndExecute(`
          SELECT 
            features.name AS feature,
              feature_capability.permissions
          FROM 
            ((((roles INNER JOIN roles_capability ON roles.id = roles_capability.role_id)
              INNER JOIN capability ON capability.id = roles_capability.capability_id)) 
              INNER JOIN feature_capability ON roles_capability.capability_id = feature_capability.capability_id)
              INNER JOIN features ON feature_capability.feature_id = features.id  
          WHERE role_id = ${user[0]?.role_id}
          ORDER BY role_id ;
          `);
        res.send({ msg: "Login Success", token, accessData: permissions });
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
    res.status(500).send({ msg: error.message });
  }
});

coachRouter.post("/verify", userAuthentication, async (req, res) => {
  const permissions = await connectSqlDBAndExecute(`
    SELECT 
      features.name AS feature,
        feature_capability.permissions
    FROM 
      ((((roles INNER JOIN roles_capability ON roles.id = roles_capability.role_id)
        INNER JOIN capability ON capability.id = roles_capability.capability_id)) 
        INNER JOIN feature_capability ON roles_capability.capability_id = feature_capability.capability_id)
        INNER JOIN features ON feature_capability.feature_id = features.id  
    WHERE role_id = ${req?.role_id}
    ORDER BY role_id ;
    `);
  res.status(201).json({
    msg: "Verified",
    status: 201,
    data: {
      username: req.username,
      role_id: req.role_id,
    },
    accessData: permissions,
  });
});

coachRouter.post(
  "/admin/roles-capability",
  userAuthentication,
  async (req, res) => {
    try {
      if (req.role_id !== 1)
        return res.status(401).json({ json: "Not A Admin! ...Unauthorized" });
      const query = `    
        SELECT 
          feature_capability.id as feature_capability_id, capability.name as capability_name ,roles.id, roles.name as role, roles_capability.capability_id, 
            capability.name AS capability_name, feature_capability.permissions, 
            features.name AS feature, features.id as feature_id , features.app_name
        FROM 
          ((((roles JOIN roles_capability ON roles.id = roles_capability.role_id)
            JOIN capability ON capability.id = roles_capability.capability_id)) 
            JOIN feature_capability ON roles_capability.capability_id = feature_capability.capability_id)
            JOIN features ON feature_capability.feature_id = features.id  
        ORDER BY capability.id ;
    `;
      const rolesCapability = await connectSqlDBAndExecute(query);
      const groupedData = groupByRole(rolesCapability);
      res.status(200).json({ data: groupedData });
    } catch (error) {
      res.status(500).json({ msg: error.message });
    }
  }
);

coachRouter.put(
  "/update-permission",
  userAuthentication,
  async (req, res, next) => {
    try {
      const { cap_feature_id, permission } = req.body;
      if (req.role_id !== 1)
        return res.status(401).json({ json: "Not A Admin! ...Unauthorized" });
      const query = `SELECT * FROM feature_capability WHERE feature_capability.id = ${cap_feature_id} ;`;
      let featureCapability = await connectSqlDBAndExecute(query);
      let prevPermission = featureCapability[0]?.permissions;
      if (featureCapability?.permissions?.includes(permission)) {
        prevPermission = prevPermission.replace(permission, "");
      } else {
        prevPermission = prevPermission + permission;
      }

      await connectSqlDBAndExecute(`
          UPDATE feature_capability SET permissions = "${prevPermission}"
          WHERE feature_capability.id = ${cap_feature_id}
      `);
      res.send({ msg: "Done Successfully" });
    } catch (error) {
      res.status(500).json({ msg: error.message });
    }
  }
);

exports.coachRouter = coachRouter;
