const app = require('../server');
const { logger } = require('../loaders/logger');
// const { setTwilioInfoToApp } = require('../api/routes/sms-incoming');
const taskRouter = require('../service/twilioTaskRouter');
const initAirtable = require('../loaders/airtableController');

const runJob = async () => {
  initAirtable();
  logger.info('Airtable ready');
  await taskRouter.init();
  logger.info('TaskRouter Initialized');
  logger.info('Starting 2PM - 5PM shift');
  await taskRouter.startShift('2PM - 5PM');
  logger.info('2PM - 5PM shift started');
};

app.get('/jobs/start-2pm-5pm-shift', async (req, res) => {
  await runJob();
  res.sendStatus(200);
});
