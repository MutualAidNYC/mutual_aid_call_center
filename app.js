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

const port = process.env.PORT || 80;

const onListen = () =>
  console.log(
    moment().tz('America/New_York').format(),
    `Server is running on port ${port}`,
  );
const startUp = (languagesToPhones) => {
  saveShiftNumbers(languagesToPhones);
  app.listen(port, onListen);
};

app.get('/', (req, res) => {
  res.send('Hello World!!');
});

// start the engine
getInitialShift(startUp);
module.exports = app;
