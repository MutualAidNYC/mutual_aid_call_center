'use stict';

console.log('warming up');
const dotenv = require('dotenv');

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

const onListen = () => console.log(`Server is running on port ${port}`);
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
