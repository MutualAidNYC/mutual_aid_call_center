const dotenv = require('dotenv');
const axios = require('axios');
const app = require('../../server');

const SCHEDULE = 'schedule';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config(); // load the local .env file
}

/**
 * Transforms the schedule retrieved from airbase RESTful api into
 * the format that the consumer of the route expects
 * @author Aaron Young <hi@aaronyoung.io>
 * @param {Object} airbaseSchedule - Schedule returned from airbase's api
 * @return {Object} - This represents a transformed schedule object
 */
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

/**
 * Generates a function that queries airtable for data from the 'General Hours'
 * table of the given base
 * @author Aaron Young <hi@aaronyoung.io>
 * @param {String} base - ID of the base we are generating a query function for
 * @return {Function} - This function will always query the given base
 */

const getScheduleFromBase = (base) => {
  const config = {
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
    },
  };

  /**
   * A function that will actually do the query for the base
   * @author Aaron Young <hi@aaronyoung.io>
   * @return {Promise} - this will resolve into a transformed schedule object
   */
  return async () => {
    let schedule;
    try {
      const response = await axios.get(
        `https://api.airtable.com/v0/${base}/General%20Hours`,
        config,
      );
      schedule = transformSchedule(response.data);
    } catch (err) {
      console.error(err);
    }
    return schedule;
  };
};

const getTheSchedule = getScheduleFromBase(process.env.PHONE_BASE);

/**
 * sets within express the development schedule
 * @author Aaron Young <hi@aaronyoung.io>
 * @param {Function} getSchedule - defaults to a function that when
 * invoked returns a schedule object
 * @return {void}
 */

/**
 * sets within express the schedule
 * @author Aaron Young <hi@aaronyoung.io>
 * @param {Function} getSchedule - defaults to a function that when
 * invoked returns a schedule object
 * @return {void}
 */
const setSchedule = async (getSchedule = getTheSchedule) => {
  const schedule = await getSchedule();
  app.set(SCHEDULE, schedule);
};

/**
 * An express route function that matches the required express signature
 * This will respond with a development schedule
 * @author Aaron Young <hi@aaronyoung.io>
 * @param {Object} _req - an express request object
 * @param {Object} res - an express response object
 * @return {void}
 */

/**
 * An express route function that matches the required express signature
 * This will respond with a schedule
 * @author Aaron Young <hi@aaronyoung.io>
 * @param {Object} _req - an express request object
 * @param {Object} res - an express response object
 * @return {void}
 */
const getProduction = async (_req, res) => {
  const schedule = app.get(SCHEDULE);
  res.status(200).json(schedule);
};

app.get('/api/schedule/production', getProduction);

// exporting for tests and startup and event loop
module.exports = {
  transformSchedule,
  getScheduleFromBase,
  setSchedule,
};
