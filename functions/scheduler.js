// const axios = require("axios");
const Moment = require("moment-timezone");
const MomentRange = require("moment-range");
const moment = MomentRange.extendMoment(Moment);

const TIMEZONE = "America/New_York";
const HOLIDAYS = "holidays";
const PARTIAL_DAYS = "partialDays";

exports.handler = function (context, event, callback) {
  //create Twilio Response
  let response = createResponseObject();
  const schedule = getAsset("schedule.js");

  // set some variables
  const currentDate = moment().tz(TIMEZONE).format("MM/DD/YYYY");
  const isHoliday = currentDate in schedule.holidays;
  const isPartialDay = currentDate in schedule.partialDays;

  if (isHoliday) {
    response.body.isHoliday = true;
    response = setDescription(response, schedule, HOLIDAYS);
  } else if (isPartialDay) {
    response.body.isPartialDay = true;
    response = setDescription(response, schedule, PARTIAL_DAYS);

    const { begin, end } = schedule.partialDays[currentDate];
    const inTimeRange = checkIfInRange(begin, end, TIMEZONE);

    if (inTimeRange) response.body.isOpen = true;
  } else {
    //regular hours
    const dayOfWeek = moment().tz(TIMEZONE).format("dddd");
    const { begin, end } = schedule.regularHours[dayOfWeek];
    const inTimeRange = checkIfInRange(begin, end, TIMEZONE);

    response.body.isRegularDay = true;

    if (inTimeRange) response.body.isOpen = true;
  }
  callback(null, response);
};

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

const setDescription = (response, schedule, dayType) => {
  if (typeof schedule[daytype][currentDate].description !== "undefined") {
    response.body.description = schedule[daytype][currentDate].description;
  }
  return response;
};

const createResponseObject = () => {
  //create Twilio Response
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

const getAsset = (assetName) => {
  const assets = Runtime.getAssets();
  const privateAsset = assets[`/${assetName}`];
  const privatePath = privateAsset.path;
  return require(privatePath);
};
