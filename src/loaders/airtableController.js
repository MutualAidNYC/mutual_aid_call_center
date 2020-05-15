const airTableController = require('../service/airtableController');
const taskRouter = require('../service/twilioTaskRouter');

module.exports = () => {
  airTableController.taskRouter = taskRouter;
  airTableController.pollForDownloadedVmToDelete();
};
