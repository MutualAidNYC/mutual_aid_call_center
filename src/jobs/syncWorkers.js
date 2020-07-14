const { logger } = require('../loaders/logger');
// const { setTwilioInfoToApp } = require('../api/routes/sms-incoming');
const taskRouter = require('../service/twilioTaskRouter');
const initAirtable = require('../loaders/airtableController');

const runJob = async () => {
  initAirtable();
  logger.info('Airtable ready');
  await taskRouter.syncWorkers();
  logger.info('Workers synced');
};

runJob();
