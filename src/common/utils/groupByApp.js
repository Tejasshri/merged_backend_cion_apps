function groupByApp(data) {
  let apps = [];
  data.forEach((each) => {
    const has = apps.some((eachApp) => eachApp.app_name === each.app_name);
    if (!has) {
      apps.push({
        app_name: each.app_name,
        features: [
          {
            feature_capability_id: each.feature_capability_id,
            permission: each.permissions,
            featureName: each.feature,
            feature_id: each.feature_id,
            feature_cap_permission_id: each.feature_capability_id,
          },
        ],
      });
    } else {
      apps = apps.map((eachApp) => {
        if (each.app_name === eachApp.app_name) {
          console.log(eachApp);
          return {
            ...eachApp,
            features: [...eachApp.features, {
              feature_capability_id: each.feature_capability_id,
              permission: each.permissions,
              featureName: each.feature,
              feature_id: each.feature_id,
              feature_cap_permission_id: each.feature_capability_id,
            }],
          };
        }
        return eachApp;
      });
    }
  }); 
  return apps
}

module.exports.groupByApp = groupByApp;
