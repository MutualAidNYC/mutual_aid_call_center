"use strict";
const axios = require("axios");
const { CancelToken } = axios;

// find the serverless function path then require the path
const helpers = require(Runtime.getFunctions()["helperFunctions"].path);

// setup some constants
const OPEN = "Open";
const CLOSE = "Close";
const TIMEOUT = 1500;

/**
 * Main invoked function (called by twillio flow)
 * Checks schedule.private.js for the schedule and then sets up and returns a
 * response object to provide variables to a flow.
 *
 * This is a modified version of a function from:
 * https://www.twilio.com/blog/advanced-schedules-studio
 * @author Aaron Young <hi@aaronyoung.io>
 * @param {Object} _context - Provides information about the current execution environment
 * @param {Object} event - Contains the request parameters passed into your Twilio Function
 * @param {Function} callback - Function used to complete execution and emit responses
 * @return {void}
 */
exports.handler = function (_context, event, callback) {
  //create Twilio Response with default values in body
  let response = helpers.createResponseObject({ isOpen: false });
  let cancel = { exec: null };

  const results = getSchedule(response, event, cancel)
    .then(() => {
      callback(null, response);
    })
    .catch((err) => {
      // If there was an error
      if (axios.isCancel(err)) {
        // Was it canceled by the code?
        console.log("Request canceled because of a ", err.message);
      } else {
        // handle error
        console.log("err: ", err);
      }
      callback(err, response); // isOpen is defaulted to false
    });
  setTimeout(() => {
    if (!results.ok) {
      // if the timeout fires, and our results didn't come back
      // then we'll call the cancel func set by CancelToken
      cancel.exec(`timeout of ${TIMEOUT} miliseconds`);
    }
  }, TIMEOUT);
};

/**
 * Main logic to get the schedule Checks a website for the schedule and then
 * sets up and returns aresponse object to provide variables to a flow.
 *
 * This is a modified version of a function from:
 * https://www.twilio.com/blog/advanced-schedules-studio
 * @author Aaron Young <hi@aaronyoung.io>
 * @param {Object} response - Twilio response object
 * @param {Object} event - Contains the request parameters passed into the Twilio Function
 * @param {Function} cancel - Function used to cancel axios get request
 * @return {Promise} - This represents a completed response object
 */
const getSchedule = (response, event, cancel) => {
  const { timezone, scheduleUrl } = event;
  const config = {
    // CancelToken takes a func that has the cancel function for it's param
    // we'll set it to a prop on our cancel object that we passed in. Then we'll
    // call this function where/when we need to cancel this request
    cancelToken: new CancelToken((c) => (cancel.exec = c)),
  };
  return axios
    .get(scheduleUrl, config) // fetch the json file from the provided path
    .then((result) => {
      const schedule = {}; // empty object to the schedule under it's day key
      result.data.forEach((daysSchedule) => {
        // add schedule to day object using it's day key
        schedule[daysSchedule.Day] = daysSchedule;
      });

      const dayOfWeek = helpers.getDayOfWeek(timezone);
      const daySchedule = schedule[dayOfWeek];

      // lets retrieve the time in 24 hour format
      const openTime = helpers.getTimeStringFromObject(daySchedule, OPEN);
      const closeTime = helpers.getTimeStringFromObject(daySchedule, CLOSE);

      // is the time between open and close?
      const inTimeRange = helpers.checkIfInRange(openTime, closeTime, timezone);

      // put variables on response.body to pass back into the studio flow
      response.body.schedule = JSON.stringify(schedule);
      response.body.isOpen = inTimeRange;

      // lets give twilio the result of our operations
      return response;
    });
};
