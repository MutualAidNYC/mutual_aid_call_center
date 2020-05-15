'use stict';

const dotenv = require('dotenv');
const { logger } = require('./loaders/logger');

if (process.env.NODE_ENV !== 'production') {
  dotenv.config(); // load the local .env file
}
logger.info('warming up');
const initLoaders = require('./loaders');
const app = require('./server');
const { getInitialShift, saveShiftNumbers } = require('./jobs/getShiftNumbers');
require('./api/routes/language');
require('./api/routes/sms-incoming');
require('./api/routes/call-assignment');
require('./api/routes/agent-connected');
require('./api/routes/worker-bridge-disconnect');
require('./api/routes/vm-recording-ended');

const { setDevSchedule, setProdSchedule } = require('./api/routes/schedule');

const port = process.env.PORT || 80;

const onListen = () => logger.info(`Server is running on port ${port}`);
const startUp = async (languagesToPhones) => {
  saveShiftNumbers(languagesToPhones);
  logger.info('Got shift phone numbers');
  await setDevSchedule();
  logger.info('Development phone schedule loaded');
  await setProdSchedule();
  logger.info('Production phone schedule loaded');
  await initLoaders();
  // await setTwilioInfoToApp();
  // logger.info('Twillio loaded');
  app.listen(port, onListen);

  // event loop, we want these things to happen at a slow poll
  setInterval(() => {
    setDevSchedule();
    setProdSchedule();
  }, process.env.AIRTABLE_DELAY);
};

app.get('/', (req, res) => {
  res.send('Hello World!!');
});

// start the engine
getInitialShift(startUp);
module.exports = app;
