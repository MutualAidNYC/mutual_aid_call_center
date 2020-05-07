const { logger } = require('./logger');
const { setTwilioInfoToApp } = require('../api/routes/sms-incoming');

module.exports = async (expressApp) => {
  await setTwilioInfoToApp(expressApp);
  logger.info('twilio loaded');
};
