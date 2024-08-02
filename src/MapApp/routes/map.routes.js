const { Router, query } = require("express");
const userAuthentication = require("../../common/middlewares/auth.middleware.js");
const { connectSqlDBAndExecute } = require("../../common/utils/connectDB.js");
const permissionCheck = require("../../common/middlewares/permission.middleware.js");

const path = require("path");
const fs = require("fs");
const { features } = require("process");

const areaRouter = Router();

areaRouter.post(
  "/area-wise-boundary",
  userAuthentication,
  (...rest) => permissionCheck(...rest, "maps", "r"),
  async (req, res) => {
    try {
      const jsonFilePath = path.join(
        process.cwd(),
        "data",
        "completeData.json"
      );
      console.clear();
      console.log(process.cwd());

      // Read the JSON file
      const jsonData = fs.readFileSync(jsonFilePath, "utf8");

      // Parse the JSON data
      const data = JSON.parse(jsonData);

      // If you need to filter the data based on `area`, you can do it here
      // For example:
      const filteredData = data;

      return res.status(200).json({ data: filteredData });
    } catch (error) {
      console.log(error.message);
      res.status(400).json({ msg: "Something Went Wrong" + error.message });
    }
  }
);

async function getDataFromFile(fileName) {
  try {
    const jsonFilePath = path.join(process.cwd(), "data", `${fileName}.json`);
    console.clear();
    console.log(process.cwd());

    // Read the JSON file
    const jsonData = fs.readFileSync(jsonFilePath, "utf8");

    // Parse the JSON data
    const data = JSON.parse(jsonData);
    return data;
  } catch (error) {
    console.log(error);
  }
}

areaRouter.post(
  "/district-wise-boundary",
  userAuthentication,
  (...rest) => permissionCheck(...rest, "maps", "r"),
  async (req, res) => {
    try {
      // If you need to filter the data based on `area`, you can do it here
      // For example:
      const filteredData = await getDataFromFile("district");
      return res.status(200).json({ data: filteredData });
    } catch (error) {
      console.log(error.message);
      res.status(400).json({ msg: "Something Went Wrong" + error.message });
    }
  }
);

areaRouter.post(
  "/district-wise-boundary/karnatka",
  userAuthentication,
  (...rest) => permissionCheck(...rest, "maps", "r"),
  async (req, res) => {
    try {
      const filteredData = await getDataFromFile("karnatakaDistrictsUpdated");
      console.clear();
      let updated = {
        ...filteredData, 
        features: filteredData.features.filter(each => {
          if (each?.properties?.KGISDist_1 === "Bidar"){
            return true
          }
        })
      }
      console.log(filteredData);
      return res.status(200).json({ data: updated });
    } catch (error) {
      console.log(error.message);
      res.status(400).json({ msg: "Something Went Wrong" + error.message });
    }
  }
);

module.exports.areaRouter = areaRouter;
