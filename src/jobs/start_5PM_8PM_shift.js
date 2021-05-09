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
  logger.info('Starting 5PM - 8PM shift');
  await taskRouter.startShift('5PM - 8PM');
  logger.info('5PM - 8PM shift started');
};

app.get('/jobs/start-5pm-8pm-shift', async (req, res) => {
  await runJob();
  res.sendStatus(200);
});
