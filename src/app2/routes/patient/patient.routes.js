const { Router } = require("express");
const { connectSqlDB } = require("../../../common/utils/connectDB.js");
const userAuthentication = require("../../../common/middlewares/auth.middleware.js");
const { addTimestamps } = require("../../../common/utils/helper.js");
const {
  uploadToWhatsApp,
} = require("../../../common/utils/uploadToWhatsApp.js");

// let connection;
// const startDb = async () => {
//   try {
//     connection = await connectSqlDB("patientRouter");
//     // connection.query(`INSERT INTO users (email,password,username)VALUES('tejas@gmail.com',12345,'tejas')`, (err, result) => {
//     //   console.log(result, "dfdf");
//     // });
//   } catch (error) {
//     console.log(error.message);
//   }
// };
// startDb();

const patientRouter = Router();

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

patientRouter.use((req, res, next) => {
  let connection;
  const startDb = async () => {
    try {
      connection = await connectSqlDB("patientRouter");
      req.connection = connection;
      next();
    } catch (error) {
      console.log(error.message);
    }
  };
  startDb();
});

patientRouter.get("/get-leads", userAuthentication, async (req, res) => {
  const { connection } = req;
  try {
    connection.query(
      `SELECT * FROM allleads ORDER BY id DESC `,
      (err, result) => {
        if (err) throw err;
        else {
          const convertedArray = result.map((each) => {
            const date = new Date(each.dateOfContact);
            return {
              ...each,
              dateOfContact: formatDate(each.dateOfContact),
            };
          });
          res.json(convertedArray);
        }
      }
    );
    // const rows = await executeQuery(`SELECT * FROM allleads ORDER BY id DESC `);
    // // To convert the date into YYYY-MM-DD format converting the recieved data
  } catch (err) {
    res.status(500).send("Error executing query");
  } finally {
    connection.end();
  }
});

patientRouter.get("/patiens/:id", userAuthentication, async (req, res) => {
  const { id } = req.params;
  const { connection } = req;
  try {
    connection.query(
      `SELECT * FROM allleads WHERE id = ${id}`,
      (err, result) => {
        if (err) throw err;
        else {
          if (result.length > 0) {
            const userDetails = result[0];
            res.status(200).json(userDetails);
          } else {
            res.status(404).json({ message: "User details not found" });
          }
        }
      }
    );
  } catch (err) {
    res.status(400).send(err);
  } finally {
    connection.end();
  }
});

patientRouter.post("/add-lead", userAuthentication, async (req, res) => {
  // First it will get all the values from the frontend than insets into all leads
  const {
    phoneNumber,
    callerName,
    age,
    coachNotes,
    coachName,
    campaign,
    conv,
    email,
    gender,
    inboundOutbound,
    interested,
    leadChannel,
    level,
    location,
    patientName,
    preOp,
    relationsToPatient,
    relevant,
    stage,
    typeOfCancer,
    dateOfContact,
  } = req.body;
  const { connection } = req;
  try {
    connection.query(
      `
      INSERT INTO allleads (phoneNumber, callerName, campaign, age,  coachName, conv,
         email, gender, inboundOutbound, interested, coachNotes, leadchannel, level, location, patientName,
         preOp, relationsToPatient, relevant, stage,  typeOfCancer, dateOfContact)
      VALUES (
       ${parseInt(
         phoneNumber
       )}, '${callerName}','${campaign}', ${age},   '${coachName}',  '${conv}',
       '${email}', '${gender}', '${inboundOutbound}', '${interested}', '${coachNotes}', '${leadChannel}', '${level}', '${location}', '${patientName}',
       '${preOp}', '${relationsToPatient}', '${relevant}', 'Lead',  '${typeOfCancer}', '${dateOfContact}'
      );
    `,
      (err, result) => {
        if (err) throw err;
        else {
          res.send({ message: "New Lead Added Successfully" });
        }
      }
    );
  } catch (err) {
    res.status(500).send({ message: err.message });
  } finally {
    connection.end();
  }
});

patientRouter.put("/update-lead", userAuthentication, async (req, res) => {
  let { field, id, value, followupId } = req.body;
  const { connection } = req;
  async function updateEachCell() {
    try {
      // To get leads based on lead id
      // const rows = await executeQuery(
      //   `SELECT * FROM allleads WHERE id = ${id}`
      // );
      /*
         if the rows value length > 0  then it will update the value 
         that is updated in the frontend. For example If the coach 
         changes the PatientName to something than the field will 
         become patientName and value become the changed value */
      connection.query(
        `UPDATE allleads SET ${field}='${value}' WHERE id = ${id}`,
        (err, result) => {
          if (err) throw err;
          else {
            res.status(200).send("Lead updated successfully");
          }
        }
      );
    } catch (err) {
      res.status(500).send("Failed to updated lead");
    }
  }

  try {
    // If the Filed = level and changed value = closed, than it will change all the previous stage status value to Cancelled
    if (field === "level" && value === "Closed") {
      connection.query(
        `UPDATE followup_table SET status='Cancelled' WHERE leadId = ${id} AND status = 'Scheduled'`,
        (err, result) => {
          if (err) throw err;
          else {
            updateEachCell();
          }
        }
      );
    } else {
      updateEachCell();
    }
  } catch (err) {
    res.status(500).send("Failed to update lead");
  } finally {
    connection.end();
  }
});

patientRouter.put(
  "/update-followup-lead",
  userAuthentication,
  async (req, res) => {
    const { field, id, value, followupId, leadStage } = req.body;
    const { connection } = req;
    try {
      // Field means the changed field in the frontend not the changed value
      if (field === "date") {
        // To get all the
        // const getAllLeadsValues = await executeQuery(
        //   `SELECT * FROM followup_table WHERE leadId = ${id} AND followupId = ${followupId}`
        // );
        connection.query(
          `SELECT * FROM followup_table WHERE leadId = ${id} AND followupId between ${followupId} AND 4`,
          (err, result) => {
            if (err) throw err;
            else {
              const followupDates = [value];
              const differanceDays = leadStage === "Ip" ? 14 : 1;
              // To getNext businness days with mentiond getallLEadFollowup variable
              function getNextBusinessDay(startDate, days) {
                let currentDate = startDate;
                let count = 0;
                while (count < days) {
                  currentDate = addDays(currentDate, differanceDays);
                  if (!isSunday(currentDate)) {
                    count++;
                  }
                }

                return format(currentDate, "yyyy-MM-dd");
              }
              // To iterate based on length of the getallLEadFollowup variable
              for (let i = 1; i <= result.length - 1; i++) {
                const today = followupDates.at(-1);
                const nextBusinessDay = getNextBusinessDay(today, 1);
                followupDates.push(nextBusinessDay);
              }

              // To update all the retirved followup dates
              const updateQueries = followupDates.map(
                (date, index) =>
                  `UPDATE followup_table SET date = '${date}'  WHERE leadId = ${id} AND followupId = ${
                    followupId + index
                  }`
              );

              // Execute the update queries
              for (const querys of updateQueries) {
                connection.query(querys, (err, result) => {
                  if (err) throw err;
                  else {
                    console.log("Success");
                  }
                });
              }

              res.status(200).send({ message: "Sucessfully added" });
            }
          }
        );
      } else {
        // To update the followup values directly into followup_table
        connection.query(
          `UPDATE followup_table
        SET ${field}='${value}'
        WHERE leadId = ${id} AND followupId = ${followupId} AND leadStage = '${leadStage}'`,
          (err, result) => {
            if (err) throw err;
            else {
              return res
                .status(200)
                .send({ message: "Lead updated successfully" });
            }
          }
        );
      }
    } catch (err) {
      console.log(errr);
      res.status(500).send("Failed to update lead");
    } finally {
      connection.end();
    }
  }
);

// Route to add the follow-up
patientRouter.post("/add-followup", userAuthentication, async (req, res) => {
  const { id, stage } = req.body;
  const { connection } = req;
  let currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + 1);
  // To check whether current day is sunday or not
  if (currentDate.getDay() === 0) {
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // All following business days will be assigned to this variable by default the first date will be current date
  let followupDates = [formatDate(currentDate)];
  // To get the all  stage Values
  try {
    connection.query(
      `SELECT * FROM followup_table WHERE leadId = ${id}`,
      (err, result) => {
        if (err) throw err;
        else {
          // To check whether the current stage value exists or not
          const filterStageRows = result.filter(
            (each) => each.leadStage === stage
          );
          // This Condition checks whether the current stage already exists
          if (filterStageRows.length > 0) {
            res.status(404).send({ message: "This lead Id Already Exsits" });
          } else {
            if (stage === "Op") {
              // To Update all the Previous Lead value status to Cancelled if it was scheduled
              connection.query(
                `UPDATE followup_table SET status = 'Cancelled' WHERE leadId = ${id} AND leadStage = 'Lead' AND status != 'Cancelled'`,
                (err, result) => {
                  if (err) throw err;
                }
              );
            } else if (stage === "Diag") {
              // To Update all the Previous Lead value AND OP  status to Cancelled if it was scheduled
              connection.query(
                `
          UPDATE followup_table 
          SET status = 'Cancelled' 
          WHERE leadId = ${id} 
          AND leadStage IN ('Lead', 'Op') 
          AND status != 'Cancelled'
      `,
                (err, result) => {
                  if (err) throw err;
                }
              );
            } else if (stage === "Ip") {
              // To Update all the Previous Lead value AND OP  AND IP status to Cancelled if it was scheduled
              connection.query(
                `
          UPDATE followup_table 
          SET status = 'Cancelled' 
          WHERE leadId = ${id} 
          AND leadStage IN ('Lead', 'Op', 'Diag') 
          AND status != 'Cancelled'
      `,
                (err, result) => {
                  if (err) throw err;
                }
              );
            }
            // To pass differance between followupdates based on stage if stage === "Ip" than 14 days otherwise 1 day
            const daysDifferance = stage === "Ip" ? 14 : 1;

            function getNextBusinessDay(startDate, days) {
              let currentDate = startDate;
              let count = 0;

              while (count < days) {
                currentDate = addDays(currentDate, 1);
                if (!isSunday(currentDate)) {
                  count++;
                }
              }

              return format(currentDate, "yyyy-MM-dd");
            }
            // To get following 3 dates with 3 iterations
            for (let i = 1; i <= 3; i++) {
              // It will access the followupdates last index value
              const today = followupDates.at(-1);
              const nextBusinessDay = getNextBusinessDay(today, daysDifferance);
              //to append to followup date array at the end
              followupDates.push(nextBusinessDay);
            }

            // To insert the followups into followup table by running map query
            const values = followupDates.map(
              (each, index) =>
                `(${id}, ${
                  index + 1
                }, '${stage}', '${each}', 'Scheduled', 'Default')`
            );

            connection.query(
              `INSERT INTO followup_table (leadId, followupId,  leadStage, date, status, coachNotes) VALUES ${values.join(
                ","
              )}`,
              (err, result) => {
                if (err) throw err;
                else {
                  res.status(200).json({
                    message: "Follow-up records inserted successfully",
                  });
                }
              }
            );
          }
        }
      }
    );
  } catch (err) {
    res.status(500).send({ message: "Failed To add followups" });
  } finally {
    connection.end();
  }
});

patientRouter.put("/update-followup-dates", async (req, res) => {
  const { connection } = req;
  try {
    const { field, id, value, followupId, leadStage, changeDate } = req.body;
    // To get all Lead Id followups

    connection.query(
      `SELECT * FROM followup_table WHERE leadId = ${id} AND leadStage = '${leadStage}' AND followupId between ${
        followupId + 1
      } AND 4`,
      (err, result) => {
        if (err) throw err;
        else {
          // If it was the last followup than it will direct update the coachNotes otherwise update the remiang followup dates
          if (followupId !== 4) {
            const followupDates = [changeDate];
            const differanceDays = leadStage === "Ip" ? 14 : 1;
            // To getNext businness days with mentiond getallLEadFollowup variable
            function getNextBusinessDay(startDate, days) {
              let currentDate = startDate;
              let count = 0;
              while (count < days) {
                currentDate = addDays(currentDate, differanceDays);
                if (!isSunday(currentDate)) {
                  count++;
                }
              }

              return format(currentDate, "yyyy-MM-dd");
            }
            // To iterate based on length of the getallLEadFollowup variable
            for (let i = 1; i <= result.length - 1; i++) {
              const today = followupDates.at(-1);
              const nextBusinessDay = getNextBusinessDay(today, 1);
              followupDates.push(nextBusinessDay);
            }

            // To update all the retirved followup dates
            const updateQueries = followupDates.map(
              (date, index) =>
                `UPDATE followup_table SET date = '${date}'  WHERE leadId = ${id} AND followupId = ${
                  followupId + index + 1
                }`
            );

            // Execute the update queries
            for (const query of updateQueries) {
              connection.query(query, (err, result) => {
                if (err) throw err;
              });
            }

            connection.query(
              `UPDATE followup_table
        SET status='Done'
        WHERE leadId = ${id} AND followupId = ${followupId} AND leadStage = '${leadStage}'`,
              (err, result) => {
                if (err) throw err;
                else {
                  res.send("Followup Updated Successfully");
                }
              }
            );
          } else {
            connection.query(
              `UPDATE followup_table
        SET status='Done'
        WHERE leadId = ${id} AND followupId = ${followupId} AND leadStage = '${leadStage}'`,
              (err, result) => {
                if (err) throw err;
                else {
                  res.send("Followup Updated Successfully");
                }
              }
            );
          }
          res.status(200).send({ message: "Sucessfully added" });
        }
      }
    );
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Failed to update following dates" });
  } finally {
    connection.end();
  }
});

module.exports.patientRouter = patientRouter;
