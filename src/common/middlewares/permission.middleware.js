const permissionCheck = async (req, res, next) => {
  try {
    const { mongoDB } = req;
    if (!mongoDB) return res.status(401).json({ msg: "DB not connected" });

    const rolesCollection = await mongoDB.collection("roles");
    const permissionGroupsCollection = await mongoDB.collection("permissionGroups");
    const roles = await rolesCollection.find() ; 
    const permissionGroups = await permissionGroupsCollection.find() ; 
    console.log(roles, permissionGroups)
    next();
  } catch (error) {
    res.status(500).json({ msg: "Internal Server Error " + error.message });
  }
};

module.exports = permissionCheck;
