function groupByRole(data) {
  let groupedData = [];

  for (let item of data) {
    let has = groupedData.some((each) => each.role === item.role);
    if (!has) {
      groupedData.push({
        role: item.role,
        capability_name: item.capability_name,
        features: [
          {
            featureName: item.feature,
            permission: item.permissions,
            feature_cap_permission_id: item.feature_capability_id,
            app_name: item.app_name
          },
        ],
      });
    } else {
      groupedData = groupedData.map((each) => {
        if (each.role === item.role) {
          return {
            ...each,
            features: [
              ...each.features,
              {
                featureName: item.feature,
                permission: item.permissions,
                feature_cap_permission_id: item.feature_capability_id,
                app_name: item.app_name
              },
            ],
          };
        }
        return each;
      });
    }
  }


  return groupedData;
}

module.exports.groupByRole = groupByRole;
