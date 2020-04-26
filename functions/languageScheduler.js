const Moment = require("moment-timezone");
const MomentRange = require("moment-range");
const moment = MomentRange.extendMoment(Moment);

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
  let response = createResponseObject(); //create Twilio Response
  const schedule = getPrivateAsset("schedule.js"); //get the schedule from assets

  // set some variables
  const { language, timezone } = event;
  const dayOfWeek = moment().tz(timezone).format("dddd");
  const { begin, end } = schedule.languages[language][dayOfWeek];
  const inTimeRange = checkIfInRange(begin, end, timezone);

  if (inTimeRange) response.body.isLanguageInOperation = true; // defaults to false

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
    isLanguageInOperation: false,
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
