const MONDAY = "1";
const TUESDAY = "2";
const WEDNESDAY = "3";
const FRIDAY = "5";
exports.handler = function (context, event, callback) {
  // With timezone:
  // In Functions/Configure, add NPM name: moment-timezone, version: 0.5.14
  // Timezone function reference: https://momentjs.com/timezone/
  let moment = require("moment-timezone");

  // timezone needed for Daylight Saving Time adjustment
  let timezone = event.timezone || "America/New_York";
  console.log("+ timezone: " + timezone);

  const hour = moment().tz(timezone).format("H");
  const dayOfWeek = moment().tz(timezone).format("d");
  let response; // init the variable in right scope

  let getResponse = (start, end, language) =>
    hour >= start && hour < end ? language : "closed";

  switch (dayOfWeek) {
    case MONDAY:
      response = getResponse(13, 20, "english");
      break;
    case TUESDAY:
      response = getResponse(17, 20, "spanish");
      break;
    case WEDNESDAY:
      response = getResponse(13, 20, "english");
      break;
    case FRIDAY:
      response = getResponse(1, 20, "spanish");
      break;
    default:
      response = "closed";
  }

  theResponse = response + " : " + hour + " " + dayOfWeek;
  console.log("+ Time request: " + theResponse);
  callback(null, theResponse);
};
