const dotenv = require('dotenv');

if (process.env.NODE_ENV !== 'production') {
  dotenv.config(); // load the local .env file
}

// Everything has a default value for tests in a CI/CD enviroment
module.exports = {
  twilio: {
    accountSid: process.env.ACCOUNT_SID,
    authToken: process.env.AUTH_TOKEN,
    workspaceSid: process.env.WORKSPACE_SID,
    vmWorkerSid: process.env.TWILIO_TASKROUTER_VM_SID,
    isVmEnabled: process.env.ENABLE_VM
      ? process.env.ENABLE_VM.toLowerCase().trim() === 'true'
      : false,
    isEnglishVmTranscriptionEnabled: process.env.ENABLE_VM_ENGLISH_TRANSCRIPTION
      ? process.env.ENABLE_VM_ENGLISH_TRANSCRIPTION.toLowerCase().trim() ===
        'true'
      : false,
  },
  airtable: {
    phoneBase: process.env.PHONE_BASE,
    delay: process.env.AIRTABLE_DELAY,
    apiKey: process.env.AIRTABLE_API_KEY,
    vmBase: process.env.AIRTABLE_VM_PHONE_BASE,
  },
  hostName: process.env.HOST_NAME,
  isProduction: process.env.NODE_ENV === 'production',
};
