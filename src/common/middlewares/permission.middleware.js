const { connectSqlDBAndExecute } = require("../utils/connectDB.js");

const permissionCheck = async (req, res, next, featureName, permissionType) => {
  try {
    console.log(featureName, permissionType, "ppprrr");
    const { mongoDB } = req;
    if (!mongoDB) return res.status(401).json({ msg: "DB not connected" });

    let role_id = req.role_id;

    const query = `
    SELECT 
      roles.id as role_id, roles.name as role, roles_capability.capability_id, 
        capability.name AS capability_name, feature_capability.permissions, 
        features.name AS feature
    FROM 
      ((((roles INNER JOIN roles_capability ON roles.id = roles_capability.role_id)
        INNER JOIN capability ON capability.id = roles_capability.capability_id)) 
        INNER JOIN feature_capability ON roles_capability.capability_id = feature_capability.capability_id)
        INNER JOIN features ON feature_capability.feature_id = features.id     
    WHERE 
      roles.id = ${role_id} AND 
      features.name = "${featureName}"
    ORDER BY role_id 
    ;
    `;
    const hasPermission = await connectSqlDBAndExecute(query);
    // console.clear()
    console.log(
      hasPermission,
      (hasPermission.length > 0 &&
        hasPermission[0].permissions.includes(permissionType)) ||
        "don't have permission for the " + featureName
    );
    if (
      hasPermission.length > 0 &&
      hasPermission[0].permissions.includes(permissionType)
    ) {
      next();
    } else {
      res.status(401).json({
        msg: "You don't have permission for this",
        permission: false,
      });
    }
  } catch (error) {
    console.log(
      `Error occuerd in ${req.url} in Permission Auth __ ${error.message}`
    );
    res
      .status(500)
      .json({ msg: "Internal Server Error  sjjs " + error.message });
  }
};

module.exports = permissionCheck;
