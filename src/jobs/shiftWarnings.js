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
  logger.info("Sending warnings for tomorrow's shifts");
  await taskRouter.sendAllShiftWarnings(['2PM - 5PM', '5PM - 8PM']);
};

app.get('/jobs/shift-warnings', async (req, res) => {
  await runJob();
  res.sendStatus(200);
});
