const { verify } = require("jsonwebtoken");
const { compare } = require("bcryptjs");

const userAuthentication = async (req, res, next) => {
  const { connectSqlDBAndExecute } = req;
  try {
    const authorization = req.headers.authorization;
    let token;

    if (authorization && authorization.startsWith("Bearer ")) {
      token = authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(400).json({ msg: "Missing Token" });
    }

    verify(token, process.env.TOKEN_SECRET_KEY, async (err, payload) => {
      if (err) {
        return res.status(401).json({ msg: "Invalid Token" });
      }

      try {
        const query = `SELECT * FROM users WHERE username = "${payload.username}"`;
        const result = await connectSqlDBAndExecute(query);

        console.log(result, "result query");
        if (!result || result.length === 0) {
          return res.status(401).json({ msg: "User Not Found" });
        }

        const isUserAuthenticated = result[0];

        const isPasswordMatched = await compare(
          payload.password,
          isUserAuthenticated.password
        );

        if (!isPasswordMatched) {
          return res.status(401).json({ msg: "Invalid Credentials" });
        }

        // Authentication successful, attach user information to request object
        req.email = payload.email;
        req.token = token;
        req.username = isUserAuthenticated.username;
        req.role_id = isUserAuthenticated.role_id;
        next();
      } catch (error) {
        console.error("Error in userAuthentication middleware:", error);
        res.status(500).json({ msg: "Server Error" });
      }
    });
  } catch (error) {
    console.error("Error in userAuthentication middleware:", error);
    res.status(500).json({ msg: "Server Error" });
  }
};

module.exports = userAuthentication;
