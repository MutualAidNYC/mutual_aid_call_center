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
      begin: "00:00:00",
      end: "23:59:59",
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
  languages: {
    english: {
      Monday: {
        begin: "00:00:00",
        end: "23:59:59",
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
    spanish: {
      Monday: {
        begin: "13:30:00",
        end: "20:15:00",
      },
      Tuesday: {
        begin: "17:30:00",
        end: "20:00:00",
      },
      Wednesday: {
        begin: null,
        end: null,
      },
      Thursday: {
        begin: null,
        end: null,
      },
      Friday: {
        begin: "13:30:00",
        end: "17:00:00",
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
    mandarin: {
      Monday: {
        begin: null,
        end: null,
      },
      Tuesday: {
        begin: "17:30:00",
        end: "20:00:00",
      },
      Wednesday: {
        begin: null,
        end: null,
      },
      Thursday: {
        begin: null,
        end: null,
      },
      Friday: {
        begin: null,
        end: null,
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
    russian: {
      Monday: {
        begin: null,
        end: null,
      },
      Tuesday: {
        begin: null,
        end: null,
      },
      Wednesday: {
        begin: null,
        end: null,
      },
      Thursday: {
        begin: null,
        end: null,
      },
      Friday: {
        begin: null,
        end: null,
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
    creole: {
      Monday: {
        begin: null,
        end: null,
      },
      Tuesday: {
        begin: null,
        end: null,
      },
      Wednesday: {
        begin: null,
        end: null,
      },
      Thursday: {
        begin: null,
        end: null,
      },
      Friday: {
        begin: null,
        end: null,
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
    french: {
      Monday: {
        begin: null,
        end: null,
      },
      Tuesday: {
        begin: null,
        end: null,
      },
      Wednesday: {
        begin: null,
        end: null,
      },
      Thursday: {
        begin: null,
        end: null,
      },
      Friday: {
        begin: null,
        end: null,
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
    bangla: {
      Monday: {
        begin: null,
        end: null,
      },
      Tuesday: {
        begin: null,
        end: null,
      },
      Wednesday: {
        begin: null,
        end: null,
      },
      Thursday: {
        begin: null,
        end: null,
      },
      Friday: {
        begin: null,
        end: null,
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
    urdu: {
      Monday: {
        begin: null,
        end: null,
      },
      Tuesday: {
        begin: null,
        end: null,
      },
      Wednesday: {
        begin: null,
        end: null,
      },
      Thursday: {
        begin: null,
        end: null,
      },
      Friday: {
        begin: null,
        end: null,
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
    korean: {
      Monday: {
        begin: null,
        end: null,
      },
      Tuesday: {
        begin: null,
        end: null,
      },
      Wednesday: {
        begin: null,
        end: null,
      },
      Thursday: {
        begin: null,
        end: null,
      },
      Friday: {
        begin: null,
        end: null,
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
    arabic: {
      Monday: {
        begin: null,
        end: null,
      },
      Tuesday: {
        begin: null,
        end: null,
      },
      Wednesday: {
        begin: null,
        end: null,
      },
      Thursday: {
        begin: null,
        end: null,
      },
      Friday: {
        begin: null,
        end: null,
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
    hindi: {
      Monday: {
        begin: null,
        end: null,
      },
      Tuesday: {
        begin: null,
        end: null,
      },
      Wednesday: {
        begin: null,
        end: null,
      },
      Thursday: {
        begin: null,
        end: null,
      },
      Friday: {
        begin: null,
        end: null,
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
    yiddish: {
      Monday: {
        begin: null,
        end: null,
      },
      Tuesday: {
        begin: null,
        end: null,
      },
      Wednesday: {
        begin: null,
        end: null,
      },
      Thursday: {
        begin: null,
        end: null,
      },
      Friday: {
        begin: null,
        end: null,
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
  },
};
