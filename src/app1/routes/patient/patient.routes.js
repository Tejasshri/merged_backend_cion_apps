const { Router } = require("express");
const { connectMongoDB } = require("../../../common/utils/connectDB.js");
const userAuthentication = require("../../../common/middlewares/auth.middleware.js");
const { addTimestamps } = require("../../../common/utils/helper.js");
const {
  uploadToWhatsApp,
} = require("../../../common/utils/uploadToWhatsApp.js");

const patientRouter = Router();

patientRouter.post("/patient-list", userAuthentication, async (req, res) => {
  try {
    const { mongoDB } = req;
    let { user_number } = req.body;
    const collection = await mongoDB.collection("patients");
    const messageCollection = await mongoDB.collection("messages");
    let data;

    // If a specific user number is provided
    if (user_number) {
      data = await collection.findOne(
        { patient_phone_number: user_number },
        { messages: 1 }
      );

      if (!data) {
        return res.status(404).json({ msg: "User not found", status: 404 });
      }

      const lastMessageId = data.message_ids[data.message_ids.length - 1];
      const lastMessage = await messageCollection.findOne(
        { id: lastMessageId },
        { projection: { media_data: 0 } }
      );

      data.lastMessage = lastMessage;
    } else {
      // If no specific user number is provided, get all patients
      data = await collection.find({}, { messages: 1 }).toArray();

      for (let userData of data) {
        const lastMessageId =
          userData.message_ids?.[userData.message_ids.length - 1];
        if (lastMessageId) {
          const lastMessage = await messageCollection.findOne(
            { id: lastMessageId },
            { projection: { media_data: 0 } }
          );
          userData.lastMessage = lastMessage;
        }
      }

      // Filter and sort the data based on the last message timestamp
      data = data.filter((userData) => userData.lastMessage);
      data.sort(
        (i1, i2) => i2.lastMessage.timestamp - i1.lastMessage.timestamp
      );
    }

    res.json({ data: data });
  } catch (error) {
    console.error(`Error occured in getting patient list`);
    res.status(500).json({ msg: "Internal Server Error", status: 500 });
  }
});

patientRouter.post("/update-user-note", async (req, res) => {
  try {
    const { mongoDB } = req;
    console.log(mongoDB);
    const { note, patient_phone_number } = req.body;
    const collection = mongoDB.collection("patients");
    const result = await collection.updateOne(
      { patient_phone_number },
      { $set: { note } }
    );
    console.log("updated coach note");
    res.status(200).json({ message: "Note updated successfully" });
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

patientRouter.post("/update-patient", async (req, res) => {
  try {
    const { mongoDB } = req;
    const { from, name, coach, stage, center, area } = req.body;
    const collection = await mongoDB.collection("patients");
    console.log(from, name, coach, stage, center, area);
    await collection.updateOne(
      {
        patient_phone_number: from,
      },
      {
        $set: {
          name,
          stage,
          center,
          area,
          coach,
        },
      }
    );
    console.log("updated");
    res.status(200).json({ msg: "Updated Successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error " + error.message });
  }
});

module.exports.patientRouter = patientRouter;
