// Dates should be in format of mm/dd/yyyy
// Times are in 24 hour format of hh:mm:ss
// If closed for the day, both begin and end should be null
module.exports = {
  holidays: {
    "04/25/2019": {
      description: "Christmas",
    },
  },
  partialDays: {
    "04/25/2019": {
      begin: "10:00:00",
      end: "20:00:00",
      description: "Day after Christmas",
    },
  },
  regularHours: {
    Monday: {
      begin: "13:30:00",
      end: "20:00:00",
    },
    Tuesday: {
      begin: "17:30:00",
      end: "20:00:00",
    },
    Wednesday: {
      begin: "01:30:00",
      end: "20:00:00",
    },
    Thursday: {
      begin: null,
      end: null,
    },
    Friday: {
      begin: "07:00:00",
      end: "15:00:00",
    },
    Saturday: {
      begin: null,
      end: null,
    },
    Sunday: {
      begin: null,
      end: null,
    },
  },
};
