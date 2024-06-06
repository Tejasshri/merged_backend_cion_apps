const cron = require("node-cron");
const { addDays, format, isSunday } = require("date-fns");
const { Router } = require("express");
const { connectSqlDB } = require("../../../common/utils/connectDB.js");
const userAuthentication = require("../../../common/middlewares/auth.middleware.js");
const { addTimestamps } = require("../../../common/utils/helper.js");
const {
  uploadToWhatsApp,
} = require("../../../common/utils/uploadToWhatsApp.js");

const patientRouter = Router();

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

patientRouter.get("/get-leads", userAuthentication, async (req, res) => {
  const { sqlDB } = req;
  try {
    sqlDB.query(`SELECT * FROM allleads ORDER BY id DESC `, (err, result) => {
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
    });
    // const rows = await executeQuery(`SELECT * FROM allleads ORDER BY id DESC `);
    // // To convert the date into YYYY-MM-DD format converting the recieved data
  } catch (err) {
    res.status(500).send("Error executing query");
  }
});

patientRouter.get("/patiens/:id", userAuthentication, async (req, res) => {
  const { id } = req.params;
  const { sqlDB } = req;
  try {
    sqlDB.query(`SELECT * FROM allleads WHERE id = ${id}`, (err, result) => {
      if (err) throw err;
      else {
        if (result.length > 0) {
          const userDetails = result[0];
          res.status(200).json(userDetails);
        } else {
          res.status(404).json({ message: "User details not found" });
        }
      }
    });
  } catch (err) {
    res.status(400).send(err);
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
  const { sqlDB } = req;
  try {
    sqlDB.query(
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
  }
});

patientRouter.put("/update-lead", userAuthentication, async (req, res) => {
  let { field, id, value, followupId } = req.body;
  const { sqlDB } = req;
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
      sqlDB.query(
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
      sqlDB.query(
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
  }
});

patientRouter.put(
  "/update-followup-lead",
  userAuthentication,
  async (req, res) => {
    const { field, id, value, followupId, leadStage } = req.body;
    const { sqlDB } = req;
    try {
      // Field means the changed field in the frontend not the changed value
      if (field === "date") {
        // To get all the
        // const getAllLeadsValues = await executeQuery(
        //   `SELECT * FROM followup_table WHERE leadId = ${id} AND followupId = ${followupId}`
        // );
        sqlDB.query(
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
                sqlDB.query(querys, (err, result) => {
                  if (err) throw err;
                  else {
                    console.log("Success");
                  }
                });
              }

              return res.status(200).send({ message: "Sucessfully added" });
            }
          }
        );
      } else {
        // To update the followup values directly into followup_table
        sqlDB.query(
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
    }
  }
);

// Route to add the follow-up
patientRouter.post("/add-followup", userAuthentication, async (req, res) => {
  const { id, stage } = req.body;
  const { sqlDB } = req;
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
    sqlDB.query(
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
              sqlDB.query(
                `UPDATE followup_table SET status = 'Cancelled' WHERE leadId = ${id} AND leadStage = 'Lead' AND status != 'Cancelled'`,
                (err, result) => {
                  if (err) throw err;
                }
              );
            } else if (stage === "Diag") {
              // To Update all the Previous Lead value AND OP  status to Cancelled if it was scheduled
              sqlDB.query(
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
              sqlDB.query(
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

            sqlDB.query(
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
  }
});

patientRouter.put("/update-followup-dates", async (req, res) => {
  const { sqlDB } = req;

  try {
    const { field, id, value, followupId, leadStage, changeDate } = req.body;

    // To get all Lead Id followups

    sqlDB.query(
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
              sqlDB.query(query, (err, result) => {
                if (err) throw err;
              });
            }

            sqlDB.query(
              `UPDATE followup_table
        SET status='Done'
        WHERE leadId = ${id} AND followupId = ${followupId} AND leadStage = '${leadStage}'`,
              (err, result) => {
                if (err) throw new Error(err);
                else return res.send("Followup Updated Successfully");
              }
            );
          } else {
            sqlDB.query(
              `UPDATE followup_table
        SET status='Done'
        WHERE leadId = ${id} AND followupId = ${followupId} AND leadStage = '${leadStage}'`,
              (err, result) => {
                if (err) throw err;
                else {
                  console.log("2334");
                  return res.send("Followup Updated Successfully");
                }
              }
            );
          }
        }
      }
    );
  } catch (err) {
    console.log("dfd");
    res.status(500).send({ message: "Failed to update following dates" });
  }
});

patientRouter.get(
  "/patient-followups/:id",
  userAuthentication,
  async (req, res) => {
    const { id } = req.params;
    const { sqlDB } = req;
    try {
      // To get all the patient followup from followup_table based lead id

      let query = `SELECT * FROM followup_table WHERE leadId = ${id} AND status != 'Cancelled' ORDER BY date DESC`;
      sqlDB.query(query, (err, result) => {
        if (err) {
          throw new Error(err);
        } else if (result) {
          const convertedArray = result.map((each, index) => ({
            ...each,
            fuLead: `${each.leadStage} ${each.followupId}`,
            date: formatDate(each.date),
          }));

          res.status(200).json(convertedArray);
        } else {
          res.status(400).send({ msg: "Not Found" });
        }
      });
      // To convert the followup date into YYYY-MM-DD, to add the extra value fuLead
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

patientRouter.get(
  "/dashboard-followups",
  userAuthentication,
  async (req, res) => {
    const { sqlDB } = req;
    const currentDate = new Date();
    const dateConvert = formatDate(currentDate);
    // const getTime = `${currentDate.getHours()}:${currentDate.getMinutes()}:${currentDate.getSeconds()}`;
    const istHours = currentDate.toLocaleString("en-IN", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    });
    const istMinutes = currentDate.toLocaleString("en-IN", {
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    });
    const istSeconds = currentDate.toLocaleString("en-IN", {
      second: "2-digit",
      timeZone: "Asia/Kolkata",
    });

    const getTime = `${istHours}:${istMinutes}:${istSeconds}`;
    try {
      sqlDB.query(
        `SELECT
    allleads.id,
    allleads.patientName,
    allleads.stage,
    allleads.level,
    allleads.phoneNumber,
    followup_table.date,
    followup_table.coachNotes,
    followup_table.followupId,
    followup_table.time,
    followup_table.status,
    allleads.coachName
FROM
    allleads
INNER JOIN
    followup_table
ON
    allleads.id = followup_table.leadId
WHERE
  followup_table.date = '${dateConvert}'
    AND followup_table.time <= '${getTime}'
    AND status != 'Done' AND status != 'Cancelled' AND status != 'Missed'
    AND allleads.level != 'Closed'
    ORDER BY
    CASE allleads.level
        WHEN 'Very Hot' THEN 1
        WHEN 'Hot' THEN 2
        WHEN 'Cold' THEN 3
        ELSE 4
    END
`,
        (err, result) => {
          if (err) throw err;
          else {
            return res.status(200).send(result);
          }
        }
      );
    } catch (err) {
      return res.status(400).send(err);
    }
  }
);

// Route get all followups
patientRouter.get(
  "/day-wise-followups/:date",
  userAuthentication,
  async (req, res) => {
    const { sqlDB } = req;
    const { date } = req.params;
    try {
      // To get all the followups- from followup_table based on desired date
      sqlDB.query(
        `SELECT 
    allleads.id,allleads.callerName,  allleads.patientName, allleads.stage, followup_table.coachNotes,followup_table.followupId, followup_table.followupId,followup_table.date
    FROM allleads
    INNER JOIN followup_table ON allleads.id = followup_table.leadId
    WHERE DATE(followup_table.date) = '${date}'     AND followup_table.status != "Cancelled" AND followup_table.status != "Done" AND allleads.level != "Closed"
    ORDER BY allleads.id DESC
    ;`,
        (err, result) => {
          if (err) throw err;
          else {
            // To change the date format Into YYYY-MM-DD
            const convertedArray = result.map((each) => ({
              ...each,
              date: formatDate(each.date),
              stage: `${each.stage} ${each.followupId}`,
              id: each.id,
            }));
            res.status(200).send(convertedArray);
          }
        }
      );
    } catch (err) {
      res.status(400).send(err);
    }
  }
);

module.exports.patientRouter = patientRouter;
