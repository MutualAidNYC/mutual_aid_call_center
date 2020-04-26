const Moment = require("moment-timezone");
const MomentRange = require("moment-range");
const moment = MomentRange.extendMoment(Moment);

// setup some constants
const HOLIDAYS = "holidays";
const PARTIAL_DAYS = "partialDays";

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
  let response = createResponseObject(); //create Twilio Response
  const schedule = getPrivateAsset("schedule.js"); //get the schedule from assets

  // set some variables
  const { timezone } = event;
  const currentDate = moment().tz(timezone).format("MM/DD/YYYY");
  const isHoliday = currentDate in schedule.holidays;
  const isPartialDay = currentDate in schedule.partialDays;

  if (isHoliday) {
    response.body.isHoliday = true;
    response = setDescription(response, schedule, HOLIDAYS, currentDate);
  } else if (isPartialDay) {
    response.body.isPartialDay = true;
    response = setDescription(response, schedule, PARTIAL_DAYS, currentDate);

    // the next line uses object destructuring
    const { begin, end } = schedule.partialDays[currentDate];
    const inTimeRange = checkIfInRange(begin, end, timezone);

    if (inTimeRange) response.body.isOpen = true;
  } else {
    //regular hours
    const dayOfWeek = moment().tz(timezone).format("dddd");
    const { begin, end } = schedule.regularHours[dayOfWeek];
    const inTimeRange = checkIfInRange(begin, end, timezone);

    response.body.isRegularDay = true;

    if (inTimeRange) response.body.isOpen = true;
  }

  callback(null, response);
};

//helper functions

/**
 * Detects if current time is between two time values in a specified timezone
 * This function was obtained from:
 * https://www.twilio.com/blog/advanced-schedules-studio
 * @author Lehel Gyeresi
 * @param {String} begin - The start time in format of "HH:mm:ss"
 * @param {String} end - The end time in format of "HH:mm:ss"
 * @param {String} timezone - A moments (dependancy) accepted timezone
 * @return {Boolean} - True if within the time rande otherwise false
 */
function checkIfInRange(begin, end, timezone) {
  const currentDate = moment().tz(timezone).format("MM/DD/YYYY");
  const now = moment().tz(timezone);

  const beginMomentObject = moment.tz(
    `${currentDate} ${begin}`,
    "MM/DD/YYYY HH:mm:ss",
    timezone
  );
  const endMomentObject = moment.tz(
    `${currentDate} ${end}`,
    "MM/DD/YYYY HH:mm:ss",
    timezone
  );
  const range = moment.range(beginMomentObject, endMomentObject);

  return now.within(range);
}

/**
 * Sets description value for Holidays and partial days
 * @author Aaron Young <hi@aaronyoung.io>
 * @param {Response} response - The twilio response object to modify
 * @param {Object} schedule - An object with the schdule in an appropriate format
 * @param {String} dayType - An object with the schdule in an appropriate format
 * @param {String} currentDate - A string with today's date
 * @return {Response} - Returns the modified response object
 */
const setDescription = (response, schedule, dayType, currentDate) => {
  if (typeof schedule[dayType][currentDate].description !== "undefined") {
    response.body.description = schedule[dayType][currentDate].description;
  }
  return response;
};

/**
 * Creates an initial Twilio response object with appropriate body defaults
 * @author Aaron Young <hi@aaronyoung.io>
 * @return {Response} - Returns a constructed Twilio response object
 */
const createResponseObject = () => {
  /**
   * create Twilio Response
   * https://www.twilio.com/docs/runtime/functions/invocation#constructing-a-response
   */

  let response = new Twilio.Response();
  response.appendHeader("Access-Control-Allow-Origin", "*");
  response.appendHeader("Access-Control-Allow-Methods", "OPTIONS POST");
  response.appendHeader("Content-Type", "application/json");
  response.appendHeader("Access-Control-Allow-Headers", "Content-Type");

  //create default response body
  response.body = {
    isOpen: false,
    isHoliday: false,
    isPartialDay: false,
    isRegularDay: false,
    description: "",
  };

  return response;
};

/**
 * Gets and return an exported asset
 * @author Aaron Young <hi@aaronyoung.io>
 * @param {String} assetname - The name of the asset (leave out 'private')
 * @param {Array} data - The array of cell header names
 * @return {Object} - Returns the fetched asset as an Object
 */
const getPrivateAsset = (assetName) => {
  const assets = Runtime.getAssets();
  const privateAsset = assets[`/${assetName}`];
  const privatePath = privateAsset.path;
  return require(privatePath);
};
