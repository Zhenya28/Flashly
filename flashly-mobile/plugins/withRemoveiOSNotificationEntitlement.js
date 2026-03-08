const { withEntitlementsPlist } = require('@expo/config-plugins');

const withRemoveiOSNotificationEntitlement = (config) => {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment'];
    return config;
  });
};

module.exports = withRemoveiOSNotificationEntitlement;
