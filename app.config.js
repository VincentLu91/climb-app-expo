const APP_VARIANT = process.env.APP_VARIANT;

const getAppName = () => {
  if (APP_VARIANT === "development") {
    return "Climb App (Dev)";
  }

  if (APP_VARIANT === "preview") {
    return "Climb App (Staging)";
  }

  return "Climb App";
};

const getUniqueIdentifier = () => {
  if (APP_VARIANT === "development") {
    return "com.vincelu299.climbapp.dev";
  }

  if (APP_VARIANT === "preview") {
    return "com.vincelu299.climbapp.staging";
  }

  return "com.vincelu299.climbapp";
};

const getScheme = () => {
  if (APP_VARIANT === "development") {
    return "climbapp-dev";
  }

  if (APP_VARIANT === "preview") {
    return "climbapp-staging";
  }

  return "climbapp";
};

export default ({ config }) => ({
  ...config,

  name: getAppName(),
  scheme: getScheme(),

  ios: {
    ...config.ios,
    bundleIdentifier: getUniqueIdentifier(),
  },

  android: {
    ...config.android,
    package: getUniqueIdentifier(),
  },
});
