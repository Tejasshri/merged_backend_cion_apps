const { verify } = require("jsonwebtoken");
const { compare } = require("bcryptjs");

const userAuthentication = async (req, res, next) => {
  const { connectSqlDBAndExecute } = req;
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
          res.status(401).send({ msg: "Invalid Token" });
        } else {
          const query = `SELECT * FROM users WHERE username = "${payload.username}"`;
          // console.log(query);
          const result = await connectSqlDBAndExecute(query);
          console.log(result);
          const isUserAuthenticated = result && result[0];

          if (isUserAuthenticated) {
            const isPasswordMatched = await compare(
              payload.password,
              isUserAuthenticated.password
            );
            if (isPasswordMatched) {
              req.email = payload.email;
              req.token = token;
              req.username = isUserAuthenticated.username;
              req.role_id = isUserAuthenticated.role_id;
              req.area = isUserAuthenticated.area;
              req.department = isUserAuthenticated.department;

              console.log(payload.username, "authenticated");
              try {
                const time = new Date();
                const query = `UPDATE users SET last_activity = "${time.toISOString()}" WHERE username = "${
                  req.username
                }";`;
                await connectSqlDBAndExecute(query);
              } catch (error) {
                console.log(error.message + " Error occured in updating time");
              } finally {
                next();
              }
            } else {
              res.status(400).json({ msg: "Not a valid token" });
            }
          } else {
            res.status(404).json({ msg: "Token is not of valid user" });
          }
        }
      });
    }
  } catch (error) {
    console.log(`Error occured in Middleware: ${error}`);
    res.status(500).send({ msg: `Error occured in Middleware: ${error}` });
  }
};

module.exports = userAuthentication;
