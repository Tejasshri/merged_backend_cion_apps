const { Router, query } = require("express");
const userAuthentication = require("../../common/middlewares/auth.middleware.js");
const { connectSqlDBAndExecute } = require("../../common/utils/connectDB.js");
const permissionCheck = require("../../common/middlewares/permission.middleware.js");

const path = require("path");
const fs = require("fs");
const { features } = require("process");
const buildFolderTree = require("../utils/folderTreeConvertor.js");

const docsRouter = Router();

// 
docsRouter.post("/folder", userAuthentication, async (req, res) => {
  try {
    const { current_folder_id, new_folder_name } = req?.body;
    if (!current_folder_id || !new_folder_name)
      return res.status(400).json({ msg: "Fields are empty" });
    console.log(current_folder_id, new_folder_name);
    const query = `
      INSERT INTO 
        folder 
          (name, parent_folder_id)
      VALUES 
        ('${new_folder_name}', ${current_folder_id} ) ; `;

    await connectSqlDBAndExecute(query);
    return res.status(201).json({
      data: {
        id: current_folder_id,
        name: new_folder_name,
      },
    });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ msg: "Error " + error.message });
  }
});

// for Getting the Folders
docsRouter.post("/folder/get-folder", userAuthentication, async (req, res) => {
  try {
    const { folder_id } = req?.body;
    if (folder_id) {
      const query = `
      SELECT * FROM folder WHERE parent_folder_id = ${folder_id} ; `;
      const result = await connectSqlDBAndExecute(query);
      return res.status(201).json({
        data: result,
      });
    } else {
      const query = `
        SELECT *
        FROM folder
        WHERE folder.name IN (
            SELECT features.name
            FROM features
            WHERE features.id IN (
                SELECT feature_capability.feature_id
                FROM feature_capability
                WHERE feature_capability.permissions LIKE '%r%' 
                  AND feature_capability.capability_id IN (
                    SELECT roles_capability.capability_id 
                    FROM roles_capability 
                    WHERE roles_capability.role_id = 1
                )
            )
        )
        AND (folder.id > folder.parent_folder_id OR folder.parent_folder_id IS NULL);
      `;
      console.log(query);
      const result = await connectSqlDBAndExecute(query);
      const fileQuery = "SELECT id, name, folder_id FROM files;";
      const resultFiles = await connectSqlDBAndExecute(fileQuery);
      const folderTree = buildFolderTree(result, resultFiles);
      return res.status(201).json({
        data: folderTree[0],
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ msg: "Error " + error.message });
  }
});

// update name of folder
docsRouter.put("/folder", userAuthentication, async (req, res) => {
  try {
    const { folder_id, updated_folder_name } = req?.body;
    if (folder_id || updated_folder_name) {
      const query = `
      UPDATE folder SET name = '${updated_folder_name}' WHERE id = ${folder_id} ; `;
      const result = await connectSqlDBAndExecute(query);
      return res.status(201).json({
        id: folder_id,
        name: updated_folder_name,
      });
    } else {
      const query = `
      SELECT * FROM folder WHERE parent_folder_id IS NULL ; `;
      const result = await connectSqlDBAndExecute(query);
      return res.status(201).json({
        data: result,
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ msg: "Error " + error.message });
  }
});

// delete the folder
docsRouter.delete("/folder", userAuthentication, async (req, res) => {
  try {
    const { folder_id } = req?.body;
    if (folder_id === 1) return res.status(401).json({ msg: "Access Denied" });
    if (folder_id) {
      const query = `
      DELETE FROM folder WHERE id = ${folder_id} ; `;
      const result = await connectSqlDBAndExecute(query);
      return res.status(201).json({
        msg: "Deleted Successfuly",
      });
    } else {
      return res.status(400).json({
        msg: "Field is empty",
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ msg: "Error " + error.message });
  }
});

// get the file
docsRouter.post("/file", userAuthentication, async (req, res) => {
  try {
    const { file_id } = req?.body;
    const query = `SELECT * FROM files WHERE id = ${file_id}`;
    const result = await connectSqlDBAndExecute(query);
    res.status(200).json({ data: result[0] });
  } catch (error) {
    res.status(400).json({ msg: "Error " + error.message });
  }
});

// add the file
docsRouter.post("/file/add", userAuthentication, async (req, res) => {
  
})

module.exports.docsRouter = docsRouter;
