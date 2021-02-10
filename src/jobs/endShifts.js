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
  logger.info('Ending Shifts');
  await taskRouter.endShifts();
  logger.info('Shifts ended');
};

app.get('/jobs/end-shifts', async (req, res) => {
  runJob();
  res.sendStatus(200);
});
