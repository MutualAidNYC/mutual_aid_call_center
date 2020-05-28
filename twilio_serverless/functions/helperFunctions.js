const Moment = require("moment-timezone");
const MomentRange = require("moment-range");
const moment = MomentRange.extendMoment(Moment);

module.exports = {
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
  checkIfInRange: (begin, end, timezone) => {
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
  },

  /**
   * Creates an initial Twilio response object with appropriate body defaults
   * @author Aaron Young <hi@aaronyoung.io>
   * @param {Object} [startingObj = {}] - A moments (dependancy) accepted timezone
   * @return {Response} - Returns a constructed Twilio response object
   */
  createResponseObject: (startingObj) => {
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
    response.body = startingObj;

    return response;
  },

  /**
   * This will grab the day of week in string format
   * @author Aaron Young
   * @param {String} timezone - momentJs style timezone
   * @return {String} - Titalized day of week
   */
  getDayOfWeek: (timezone) => moment().tz(timezone).format("dddd"),

  /**
   * Gets and return an exported asset
   * @author Aaron Young <hi@aaronyoung.io>
   * @param {String} assetname - The name of the asset (leave out 'private')
   * @param {Array} data - The array of cell header names
   * @return {Object} - Returns the fetched asset as an Object
   */
  getPrivateAsset: (assetName) => {
    const assets = Runtime.getAssets();
    const privateAsset = assets[`/${assetName}`];
    const privatePath = privateAsset.path;
    return require(privatePath);
  },

  /**
   * This will pull grab the specified field off of the object and convert
   * it to a 24h time string
   * @author Aaron Young
   * @param {Object} dayScheduleObj - An individual day's Object
   * @param {String} label - Label of the timestamp we wish to grab"
   * @return {String} - 24 hour timestamp in format of hh:mm:ss
   */
  getTimeStringFromObject: (dayScheduleObj, label) => {
    const dateTime = dayScheduleObj[label];
    // time stamp from airtable source is in iso 8601 format, we need to
    // convert it to a moment object then get the time out of it in 24h format
    const time = moment(dateTime, moment.ISO_8601).format("HH:mm:ss");
    return time;
  },
};
