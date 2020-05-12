const dotenv = require('dotenv');

if (process.env.NODE_ENV !== 'production') {
  dotenv.config(); // load the local .env file
}

// Everything has a default value for tests in a CI/CD enviroment
module.exports = {
  twilio: {
    accountSid: process.env.ACCOUNT_SID || 'ACbogusSid',
    authToken: process.env.AUTH_TOKEN || 'bogusToken',
    workspaceSid: process.env.WORKSPACE_SID || 'bogusWorkspace',
  },
  hostName: process.env.HOST_NAME || 'someHostName',
  isProduction: process.env.NODE_ENV === 'production',
};
