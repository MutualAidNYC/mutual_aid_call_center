"use strict";
// find the serverless function path then require the path
const helpers = require(Runtime.getFunctions()["helperFunctions"].path);

// lets set constants
const OPEN = "Open";
const CLOSE = "Close";

/**
 * Main invoked function (invoked by twillio flow)
 * Sets up and returns a response object to provide variables to a flow.
 * This will check schedule.private.js to see if the language is available
 * @author Aaron Young <hi@aaronyoung.io>
 * @param {Object} context - Provides information about the current execution environment
 * @param {Object} event - Contains the request parameters passed into your Twilio Function
 * @param {Function} callback - Function used to complete execution and emit responses
 * @return {void}
 */
exports.handler = function (_context, event, callback) {
  //create Twilio Response
  let response = helpers.createResponseObject({
    isLanguageInOperation: false,
  });
  // set some variables
  const { language, timezone } = event;
  const dayOfWeek = helpers.getDayOfWeek(timezone);
  const schedule = JSON.parse(event.schedule);
  const daySchedule = schedule[dayOfWeek];
  const openString = `${language} ${OPEN}`;
  const closeString = `${language} ${CLOSE}`;

  const openTime = helpers.getTimeStringFromObject(daySchedule, openString);
  const closeTime = helpers.getTimeStringFromObject(daySchedule, closeString);

  const inTimeRange = helpers.checkIfInRange(openTime, closeTime, timezone);

  response.body.isLanguageInOperation = inTimeRange;

  callback(null, response);
};
