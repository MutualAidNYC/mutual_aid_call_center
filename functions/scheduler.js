"use strict";
const axios = require("axios").default;
// find the serverless function path then require the path
const helpers = require(Runtime.getFunctions()["helperFunctions"].path);

// setup some constants
const OPEN = "Open";
const CLOSE = "Close";

/**
 * Main invoked function (called by twillio flow)
 * Checks schedule.private.js for the schedule and then sets up and returns a
 * response object to provide variables to a flow.
 *
 * This is a modified version of a function from:
 * https://www.twilio.com/blog/advanced-schedules-studio
 * @author Aaron Young <hi@aaronyoung.io>
 * @param {Object} context - Provides information about the current execution environment
 * @param {Object} event - Contains the request parameters passed into your Twilio Function
 * @param {Function} callback - Function used to complete execution and emit responses
 * @return {void}
 */
exports.handler = function (_context, event, callback) {
  //create Twilio Response with default values in body
  let response = helpers.createResponseObject({ isOpen: false });
  // set some variables
  const { timezone, scheduleUrl } = event;

  axios
    .get(scheduleUrl) // fetch the json file from the provided path
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
      callback(null, response);
    })
    .catch((err) => {
      // until we decide on better error handling, we'll indicate
      // business closure on an error
      callback(err, response); // isOpen is defaulted to false
    });
};
