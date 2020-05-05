const dotenv = require('dotenv');
const axios = require('axios');
const app = require('../../server');

if (process.env.NODE_ENV !== 'production') {
  dotenv.config(); // load the local .env file
}

const transformSchedule = (airbaseSchedule) => {
  const scheduleRecords = airbaseSchedule.records;
  const resultRecords = [];

  scheduleRecords.forEach((record) => {
    const newRecord = {};
    const { fields } = record;
    Object.keys(fields).forEach((key) => {
      if (key !== 'Created Time' && key !== 'Last Modified') {
        newRecord[key] = fields[key];
      }
    });
    resultRecords.push(newRecord);
  });
  // return resultRecords;
  return resultRecords;
};

const getScheduleFromBase = (base) => {
  const delay = parseInt(process.env.AIRTABLE_DELAY);
  let schedule;
  let lastRetrieved;
  const config = {
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
  };
  return async () => {
    if (!lastRetrieved || Date.now() - lastRetrieved > delay) {
      try {
        const response = await axios.get(
          `https://api.airtable.com/v0/${base}/General%20Hours`,
          config,
        );
        schedule = transformSchedule(response.data);
      } catch (err) {
        console.error(err);
      }
      lastRetrieved = Date.now();
    }
    return schedule;
  };
};

const getDevSchedule = getScheduleFromBase(process.env.AIRTABLE_DEV_PHONE_BASE);
const getProdSchedule = getScheduleFromBase(
  process.env.AIRTABLE_PROD_PHONE_BASE,
);

app.get('/api/schedule/development', async (_req, res) => {
  const schedule = await getDevSchedule();
  res.status(200).json(schedule);
});

app.get('/api/schedule/production', async (_req, res) => {
  const schedule = await getProdSchedule();
  res.status(200).json(schedule);
});

// exporting for tests
module.exports = {
  transformSchedule,
  getScheduleFromBase,
};
