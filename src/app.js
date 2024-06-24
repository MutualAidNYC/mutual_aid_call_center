'use stict';

const dotenv = require('dotenv');
const { logger } = require('./loaders/logger');

if (process.env.NODE_ENV !== 'production') {
  dotenv.config(); // load the local .env file
}
logger.info('warming up');
const initLoaders = require('./loaders');
const app = require('./server');
require('./api/routes/language');
require('./api/routes/sms-incoming');
require('./api/routes/call-assignment');
require('./api/routes/agent-connected');
require('./api/routes/worker-bridge-disconnect');
require('./api/routes/vm-recording-ended');
require('./api/routes/new-transcription');
require('./api/routes/agent-gather');
require('./api/routes/assets');
require('./api/routes/workspace-event');

require('./jobs/shiftWarnings');

const { setSchedule } = require('./api/routes/schedule');

const port = process.env.PORT || 80;

const onListen = () => logger.info(`Server is running on port ${port}`);
const startUp = async () => {
  await setSchedule();
  logger.info('Phone schedule loaded');
  await initLoaders();
  app.listen(port, onListen);

  // event loop, we want these things to happen at a slow poll
  setInterval(() => {
    setSchedule();
  }, process.env.AIRTABLE_DELAY);
};

app.get('/', (_req, res) => {
  res.send('Hello World!!');
});

// start the engine
startUp();
module.exports = app;
