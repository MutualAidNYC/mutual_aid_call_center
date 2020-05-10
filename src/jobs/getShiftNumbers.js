const dotenv = require('dotenv');
const moment = require('moment-timezone');
const Airtable = require('airtable');
const app = require('../server');

let isProd = true;
if (process.env.NODE_ENV !== 'production') {
  // load the local .env file
  dotenv.config();
  isProd = false;
}

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = isProd
  ? process.env.AIRTABLE_PROD_PHONE_BASE
  : process.env.AIRTABLE_DEV_PHONE_BASE;
const base = new Airtable({ apiKey }).base(baseId);

const todayAt = (hour) => {
  const date = moment().tz('America/New_York').format().slice(0, 10);
  return moment.tz(`${date} ${hour}`, 'America/New_York');
};

const getShiftNumbers = (timePeriod, callback) => {
  const languageToPhones = {};
  const done = (err) => {
    if (err) {
      console.error(err);
      return;
    }
    callback(languageToPhones);
  };
  const regex = /(\(|\)|\s|-)/gi;
  base('Volunteers')
    .select({ view: 'Grid view' })
    .eachPage((records, fetchNextPage) => {
      // This function (`page`) will get called for each page of records.
      records.forEach((record) => {
        const unformattedPhone = record.get('Phone');
        if (!unformattedPhone) return;

        const phoneNumber = `+1${unformattedPhone.replace(regex, '')}`;
        const languages = record.get(timePeriod);
        if (languages) {
          languages.forEach((langauge) => {
            const lowercaseLanguage = langauge.toLowerCase();
            if (!languageToPhones[lowercaseLanguage]) {
              languageToPhones[lowercaseLanguage] = [];
            }
            languageToPhones[lowercaseLanguage].push(phoneNumber);
          });
        }
      });

      // To fetch the next page of records, call `fetchNextPage`.
      // If there are more records, `page` will get called again.
      // If there are no more records, `done` will get called.
      fetchNextPage();
    }, done);
};
let shiftLastGathered;
const saveShiftNumbers = (languagesToPhones) => {
  app.set('languages', languagesToPhones);
  shiftLastGathered = moment().tz('America/New_York');
};
const shiftTimer = () => {
  // do stuff
  const now = moment().tz('America/New_York');
  const todayAt2Pm = todayAt('14');
  const todayAt5Pm = todayAt('17');
  const todayAt8Pm = todayAt('20');
  if (
    now.isBetween(todayAt2Pm, todayAt5Pm) &&
    !shiftLastGathered.isBetween(todayAt2Pm, todayAt5Pm)
  ) {
    // if now is between today at 2pm & today & 5pm and shiftLastGathered isn't
    getShiftNumbers(`${now.format('dddd')} 2PM - 5PM`, saveShiftNumbers);
  } else if (
    now.isBetween(todayAt5Pm, todayAt8Pm) &&
    !shiftLastGathered.isBetween(todayAt5Pm, todayAt8Pm)
  ) {
    // if now is between today at 2pm & today & 5pm and shiftLastGathered isn't
    getShiftNumbers(`${now.format('dddd')} 5PM - 8PM`, saveShiftNumbers);
  }

  // do it again in 0.5 seconds (or more)
  setTimeout(() => {
    shiftTimer();
  }, 1000);
};

const getInitialShift = (callback) => {
  shiftLastGathered = moment().tz('America/New_York');
  if (moment().tz('America/New_York').isBefore(todayAt(17))) {
    getShiftNumbers(
      `${moment().tz('America/New_York').format('dddd')} 2PM - 5PM`,
      callback,
    );
  } else {
    getShiftNumbers(
      `${moment().tz('America/New_York').format('dddd')} 5PM - 8PM`,
      callback,
    );
  }
  shiftTimer();
};

module.exports = {
  getInitialShift,
  saveShiftNumbers,
};
