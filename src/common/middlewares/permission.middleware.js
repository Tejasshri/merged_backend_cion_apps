const permissionCheck = async (req, res, next, featureName, permissionType) => {
  try {
    const { mongoDB } = req;
    if (!mongoDB) return res.status(401).json({ msg: "DB not connected" });

    let role = req.role;

    const rolesCollection = await mongoDB.collection("roles");
    const permissionGroupsCollection = await mongoDB.collection(
      "permissionGroups"
    );
    console.log(role);
    const roleData = await rolesCollection.findOne({ role });
    console.log(roleData);
    const permissionGroups = await permissionGroupsCollection.findOne({
      permissionGroupName: roleData.permissionGroup,
    });
    console.log(permissionGroups);
    if (
      permissionGroups?.permissions?.[featureName]?.includes(permissionType)
    ) {
      next();
    } else {
      res.status(400).json({ msg: "You don't have permission to update" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ msg: "Internal Server Error " + error.message });
  }
};

module.exports = permissionCheck;
