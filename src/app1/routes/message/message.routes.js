const { Router } = require("express");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const express = require("express");
const {compressImageBuffer} = require("../../../common/utils/filesFunctions.js")
const userAuthentication = require("../../../common/middlewares/auth.middleware.js");
const { addTimestamps } = require("../../../common/utils/helper.js");
const {
  uploadToWhatsApp,
} = require("../../../common/utils/uploadToWhatsApp.js");
const {
  deleteAllFiles,
  upload,
} = require("../../../common/utils/filesFunctions.js");

const messageRouter = Router();

messageRouter.post(
  "/message",
  userAuthentication,
  async function (request, response) {
    console.log("step 1");
    try {
      const { mongoDB } = request;
      const { type, data, to } = await request.body;
      console.log(type);
      let patientsCollection = await mongoDB.collection("patients");
      let messagesCollection = await mongoDB.collection("messages");

      let formattedObject = await getMessageObject(data, to, type);
      const ourResponse = await fetch(
        "https://graph.facebook.com/v19.0/232950459911097/messages",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.MADE_WITH} `,
          },
          body: JSON.stringify(formattedObject),
        }
      );
      console.log("step 2");
      let responseData = await ourResponse.json();
      let lastId = null;
      if (ourResponse.ok) {
        let coachMessage = addTimestamps({
          coach_phone_number: "+15556105902",
          from: to,
          coach_name: request.username,
          id: responseData.messages[0].id,
          type: type,
          text: {
            body: data.text,
          },
          reactions: [],
          message_type: "Outgoing",
          delivery_status: "",
        });
        if (type !== "reaction") {
          if (
            ["video", "audio", "image", "document", "sticker"].includes(type)
          ) {
            let bufferData = await uploadToWhatsApp(
              formattedObject[`${type}`].id
            );
            delete coachMessage.text;
            coachMessage[`${type}`] = bufferData.docTypeData;
            delete bufferData.docTypeData;
            coachMessage["media_data"] = bufferData;
            let compressedImage;
            if (type === "image") {
              compressedImage = await compressImageBuffer(bufferData.image, 5);
              coachMessage.compressedImage = compressedImage;
            }
          }

          let messageResponse = await messagesCollection.insertOne(
            coachMessage
          );
          lastId = messageResponse.insertedId;
          await patientsCollection.findOneAndUpdate(
            {
              patient_phone_number: to,
            },
            {
              $push: {
                message_ids: responseData.messages[0].id,
              },
            }
          );
        } else {
          let num = "+15556105902";
          delete coachMessage.text;
          let reactionResponse = await messagesCollection.updateOne(
            {
              id: data.message_id,
            },
            [
              {
                $set: {
                  updated_at: new Date(),
                  reactions: {
                    $cond: {
                      if: { $in: [num, "$reactions.user"] },
                      then: {
                        $map: {
                          input: "$reactions",
                          as: "reaction",
                          in: {
                            $cond: {
                              if: {
                                $eq: ["$$reaction.user", num],
                              },
                              then: {
                                user: num,
                                emoji: data.emoji,
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
                              user: num,
                              emoji: data.emoji,
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
          lastId = reactionResponse.insertedId;
        }
        response.status(201).json({
          msg: "Created Successfully",
          whatsappMessageId: responseData.messages[0].id,
          id: lastId,
        });
      } else {
        response.status(401).json({ msg: "Something Unexpected" });
      }
    } catch (error) {
      console.log(error);
      response
        .status(400)
        .json({ msg: `Something Went Wrong ${error.message}` });
    }
  }
);

messageRouter.use(
  "/recieve-media",
  userAuthentication,
  express.static("public")
);

let baseUrl = "https://merged-backend-cion-apps.onrender.com";
baseUrl = "http://localhost:3005"
messageRouter.post(
  "/recieve-media",
  userAuthentication,
  upload.single("file"),
  async (req, res) => {
    let { to, type } = req.body;
    let { token } = req;
    let pData = {
      messaging_product: "whatsapp",
      to: to,
      type: type || req.file?.mimetype?.split("/")[0] || "",
      data: {
        path: `uploads/${req.file.filename}`,
      },
    };
    console.log(pData);
    fetch(`${baseUrl}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(pData),
    })
      .then((response) => {
        if (response.status === 401) {
          console.log(response);
          throw new Error(response?.error || "Data couldn't upload");
        }
        return response.json();
      })
      .then((jsonData) => {
        deleteAllFiles("./uploads");
        res.send({ msg: "Added", data: jsonData });
      })
      .catch((error) => {
        console.log(error.message, "Error");
        res.status(400).send({ msg: error.message });
      });
  }
);

messageRouter.post("/messageData", async (req, res) => {
  try {
    const { mongoDB } = req;
    const { message_id, user_id, is_last = true, messageLimit } = req.body;

    let data;
    const collection = await mongoDB.collection("messages");
    if (message_id) {
      if (is_last) {
        data = await collection.findOne(
          { id: message_id },
          { projection: { media_data: 0 } }
        );
      } else {
        data = await collection.findOne({ id: message_id });
      }
    } else {
      data = await collection.aggregate([
        { $match: { from: user_id } },
        { $sort: { _id: -1 } },
        { $skip: 20 * messageLimit },
        { $limit: 20 },
        { $project: { media_data: 0 } },
        { $sort: { _id: 1 } },
      ]);

      data = await data.toArray();
    }
    res.send({ data: data });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ msg: "Something Went Wrong", status: 400 });
  }
});

module.exports.messageRouter = messageRouter;

async function getMessageObject(data, to, type = "text") {
  if (type === "text") {
    let messages = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "text",
      text: {
        preview_url: false,
        body: data.text,
      },
    };
    return messages;
  } else if (type === "reaction") {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "reaction",
      reaction: {
        message_id: data.message_id,
        emoji: data.emoji,
      },
    };
  } else if (
    ["video", "audio", "image", "document", "sticker"].includes(type)
  ) {
    let formData = new FormData();
    formData.append("messaging_product", "whatsapp");
    formData.append("file", fs.createReadStream(data.path));

    let mediaData = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://graph.facebook.com/v19.0/232950459911097/media",
      headers: {
        Authorization: `Bearer ${process.env.MADE_WITH}`,
        ...formData.getHeaders(),
      },
      data: formData,
    };

    try {
      let response = await axios.request(mediaData);
      const mediaId = response.data.id;
      let obj = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: type,
        [type]: {
          id: mediaId,
        },
      };
      if (type === "audio") {
        delete obj[`${type}`].caption;
        delete obj[`${type}`].filename;
      }
      return obj;
    } catch (error) {
      console.log(error.response);
    }
  }
}
