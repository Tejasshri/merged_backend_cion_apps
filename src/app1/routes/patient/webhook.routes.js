const { Router } = require("express");
const { connectMongoDB } = require("../../../common/utils/connectDB.js");
const userAuthentication = require("../../../common/middlewares/auth.middleware.js");
const { addTimestamps } = require("../../../common/utils/helper.js");
const {
  uploadToWhatsApp,
} = require("../../../common/utils/uploadToWhatsApp.js");
const webhookPatientRouter = Router();
const { executeQuery } = require("../../../common/utils/connectDB.js");

webhookPatientRouter.post("/webhook", async function (req, res) {
  let patient_mobile_number;
  const { mongoDB: db } = req;
  console.log("webhook hits");
  try {
    let patientsCollection = await db.collection("patients");
    let messagesCollection = await db.collection("messages");
    const { entry } = req.body;
    const { changes, id } = entry[0];
    const { value } = changes[0];
    patient_mobile_number = value.messages[0].from;

    if (value.statuses !== undefined) {
      return res.status(200).json({ msg: "Not need status" });
    }

    let patient = await patientsCollection.findOne({
      patient_phone_number: value.messages[0].from,
    });

    if (!patient) {
      let createdPatient = await patientsCollection.insertOne(
        addTimestamps({
          name: value?.contacts[0]?.profile?.name || "",
          image_url: "",
          patient_phone_number: value.messages[0].from,
          message_ids: [value.messages[0].id],
          coach: "",
          area: "",
          stage: "Pre-OP",
          patient_phone_number_id: id,
        })
      );
      console.log(createdPatient, "ddfdff");
      res.io.emit("update patient", {
        patientId: createdPatient.insertedId,
        userNumber: value.messages[0].from,
      });
    }

    if (value.messages[0].type === "reaction") {
      let message = await messagesCollection.findOne({
        id: value.messages[0].reaction.message_id,
      });
      if (!patient) {
        let createdPatient = await patientsCollection.insertOne(
          addTimestamps({
            name: value?.contacts[0]?.profile?.name || "",
            image_url: "",
            patient_phone_number: value.messages[0].from,
            message_ids: [value.messages[0].id],
            coach: "",
            area: "",
            stage: "",
            patient_phone_number_id: id,
          })
        );
        res.io.emit("update patient", {
          patientId: createdPatient.insertedId,
          userNumber: value.messages[0].from,
        });
      } else if (message) {
        let createdMessageId = await messagesCollection.updateOne(
          {
            id: value.messages[0].reaction.message_id,
          },
          [
            {
              $set: {
                updated_at: new Date(),
                reactions: {
                  $cond: {
                    if: { $in: [value.messages[0].from, "$reactions.user"] },
                    then: {
                      $map: {
                        input: "$reactions",
                        as: "reaction",
                        in: {
                          $cond: {
                            if: {
                              $eq: ["$$reaction.user", value.messages[0].from],
                            },
                            then: {
                              user: value.messages[0].from,
                              emoji: value.messages[0].reaction.emoji,
                            },
                            else: "$$reaction",
                          },
                        },
                      },
                    },
                    else: {
                      $concatArrays: [
                        "$reactions",
                        [
                          {
                            user: value.messages[0].from,
                            emoji: value.messages[0].reaction.emoji,
                          },
                        ],
                      ],
                    },
                  },
                },
              },
            },
          ]
        );
        // res.io.emit("update user message", {
        //   messageId: createdMessageId.insertedId,
        //   userNumber: value.messages[0].from,
        //   whatsappMessageId: value.messages[0].reaction.message_id,
        // });
      }

      return res.send({ msg: "Reaction Updated" });
    } else if (
      !["video", "audio", "image", "document", "sticker"].includes(
        value.messages[0].type
      )
    ) {
      console.log("Arrived");
      let createdMessageId = await messagesCollection.insertOne(
        addTimestamps({
          ...value.messages[0],
          message_type: "Incoming",
          reactions: [],
        })
      );
      console.log(createdMessageId);
      res.io.emit("update user message", {
        messageId: createdMessageId.insertedId,
        userNumber: value.messages[0].from,
        whatsappMessageId: value.messages[0].id,
      });
      return res.sendStatus(200);
    } else {
      if (
        ["video", "audio", "image", "document", "sticker"].includes(
          value.messages[0].type
        )
      ) {
        // console.log(value.messages[0]);
        let mediaData = await uploadToWhatsApp(
          value.messages[0][`${value.messages[0].type}`].id
        );

        delete mediaData["docTypeData"];

        let createdMessage = addTimestamps({
          ...value.messages[0],
          message_type: "Incoming",
          reactions: [],
          delivery_status: "",
          media_data: mediaData,
        });
        let compressedImage;
        if (mediaData && value.messages[0].type === "image") {
          compressedImage = await compressImageBuffer(mediaData.image, 5);
          createdMessage.compressedImage = compressedImage;
        }

        let createdMessageId = await messagesCollection.insertOne(
          createdMessage
        );

        res.io.emit("update user message", {
          messageId: createdMessageId.insertedId,
          userNumber: value.messages[0].from,
          whatsappMessageId: value.messages[0].id,
        });
        await patientsCollection.findOneAndUpdate(
          {
            patient_phone_number: value.messages[0].from,
          },
          {
            $push: {
              message_ids: value.messages[0].id,
            },
          }
        );
        return res.status(200).json({ msg: "Media Added" });
      }

      let createdMessageId = await messagesCollection.insertOne(
        addTimestamps({
          ...value.messages[0],
          message_type: "Incoming",
          reactions: [],
          delivery_status: "",
        })
      );
      res.io.emit("update user message", {
        messageId: createdMessageId.insertedId,
        userNumber: value.messages[0].from,
        whatsappMessageId: value.messages[0].id,
      });
      await patientsCollection.findOneAndUpdate(
        {
          patient_phone_number: value.messages[0].from,
        },
        {
          $push: {
            message_ids: value.messages[0].id,
          },
        }
      );
    }
    // res.io.emit("update user message", "data");
    res.send({ msg: "Reaction Updated" });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ msg: "Something Went Wrong", error: error.message });
  } finally {
  }
});

const VERIFY_TOKEN = "token1122"; // Replace "your_verify_token" with your actual verification token

webhookPatientRouter.get("/webhook", function (req, res) {
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (token === VERIFY_TOKEN) {
    res.status(200).send(challenge); // Respond with the challenge value
  } else {
    res.sendStatus(403);
  }
});

// webhookPatientRouter.get("/webhook", function (req, res) {
//   res.sendStatus(200);
// });

module.exports.webhookPatientRouter = webhookPatientRouter;
