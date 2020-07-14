const { logger } = require('./logger');
// const { setTwilioInfoToApp } = require('../api/routes/sms-incoming');
const taskRouter = require('../service/twilioTaskRouter');
const initAirtable = require('./airtableController');

module.exports = async () => {
  // await setTwilioInfoToApp(expressApp);
  await taskRouter.init();
  logger.info('twilio loaded');
  initAirtable();
  logger.info('Airtable ready');
};
