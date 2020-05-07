'use stict';

const dotenv = require('dotenv');
const moment = require('moment-timezone');

console.log(moment().tz('America/New_York').format(), 'warming up');
if (process.env.NODE_ENV !== 'production') {
  dotenv.config(); // load the local .env file
}
const app = require('./server');
const {
  getInitialShift,
  saveShiftNumbers,
} = require('./workers/getShiftNumbers');
require('./routes/api/schedule');
require('./routes/api/simuldial');

const { setDevSchedule, setProdSchedule } = require('./routes/api/schedule');

const port = process.env.PORT || 80;

const onListen = () =>
  console.log(
    moment().tz('America/New_York').format(),
    `Server is running on port ${port}`,
  );
const startUp = async (languagesToPhones) => {
  saveShiftNumbers(languagesToPhones);
  await setDevSchedule();
  await setProdSchedule();
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
