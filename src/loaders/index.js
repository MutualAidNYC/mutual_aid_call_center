const { logger } = require('./logger');
const { setTwilioInfoToApp } = require('../api/routes/sms-incoming');
const taskRouter = require('../service/twilioTaskRouter');

module.exports = async (expressApp) => {
  await setTwilioInfoToApp(expressApp);
  await taskRouter.init();
  logger.info('twilio loaded');
};
