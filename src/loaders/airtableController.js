const airTableController = require('../service/airtableController');
const taskRouter = require('../service/twilioTaskRouter');
const config = require('../config');

module.exports = () => {
  airTableController.taskRouter = taskRouter;
  if (config.twilio.isVmEnabled) {
    airTableController.pollForDownloadedVmToDelete();
  }
};
