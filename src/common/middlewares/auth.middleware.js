const { verify } = require("jsonwebtoken");
const { compare } = require("bcryptjs");
const { connectSqlDB } = require("../utils/connectDB.js");

let connection;
const startDb = async () => {
  try {
    connection = await connectSqlDB("sdsdd");
  } catch (error) {
    console.log(error.message);
  }
};
startDb();

const userAuthentication = (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    let token;
    if (authorization !== undefined) {
      token = authorization.split(" ")[1];
    }

    if (token === undefined) {
      res.status(400);
      res.send({ msg: "Missing Token" });
    } else {
      verify(token, process.env.TOKEN_SECRET_KEY, async (err, payload) => {
        if (err) {
          console.log(err);
          res.status(401).send({ msg: "Invalid Token" });
        } else {
          connection.query(
            `SELECT * FROM users WHERE username = "${payload.username}"`,
            async (err, result) => {
              const isUserAuthenticated = result[0];

              if (isUserAuthenticated) {
                const isPasswordMatched = await compare(
                  payload.password,
                  isUserAuthenticated.password
                );
                if (isPasswordMatched) {
                  req.email = payload.email;
                  req.token = token;
                  req.username = isUserAuthenticated.username;
                  console.log(payload.username, "authenticated");
                  next();
                } else {
                  res.status(400).json({ msg: "Not a valid token" });
                }
              } else {
                res.status(404).json({ msg: "Token is not of valid user" });
              }
            }
          );
        }
      });
    }
  } catch (error) {
    console.log(`Error occured in Middleware: ${error}`);
    res.status(500).send({ msg: `Error occured in Middleware: ${error}` });
  }
};

module.exports = userAuthentication;
