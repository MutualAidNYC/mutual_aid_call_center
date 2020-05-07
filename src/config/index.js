const dotenv = require('dotenv');

if (process.env.NODE_ENV !== 'production') {
  dotenv.config(); // load the local .env file
}

module.exports = {
  twilio: {
    accountSid: process.env.ACCOUNT_SID,
    authToken: process.env.AUTH_TOKEN,
    workspaceSid: process.env.WORKSPACE_SID,
  },
  hostName: process.env.HOST_NAME,
};
