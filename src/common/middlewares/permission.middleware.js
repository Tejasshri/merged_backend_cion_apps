const permissionCheck = async (req, res, next) => {
  try {
    const { mongoDB } = req;
    if (!mongoDB) return res.status(401).json({ msg: "DB not connected" });

    const roles = await mongoDB.collection("roles");
    const permissionGroups = await mongoDB.collection("permissionGroups");
    console.log(permissionGroups, roles);
    next();
  } catch (error) {
    res.status(500).json({ msg: "Internal Server Error " + error.message });
  }
};

module.exports = permissionCheck;
