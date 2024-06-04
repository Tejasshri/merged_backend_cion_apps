// Written By Tejas
require("dotenv").config();
const PORT = process.env.PORT || 3005;
const server  = require("./app.js");


const initializeDBAndServer = async () => {
  try {
    server.listen(PORT, () => {
      console.log(`Server is running on PORT ${PORT}`);
    });
  } catch (error) {
    console.log(`Something Went Wrong ${error.message}`);
  }
};

initializeDBAndServer();
// Written By Tejas
