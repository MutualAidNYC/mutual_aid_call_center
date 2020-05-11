const twilio = require('twilio');
const app = require('../../server');
const taskRouter = require('../../service/twilioTaskRouter');
const config = require('../../config');

// to be removed later when no longer in use
const client = twilio(config.twilio.accountSid, config.twilio.authToken);
const setTwilioInfoToApp = async (expressApp) => {
  const workspace = await client.taskrouter.workspaces(
    config.twilio.workspaceSid,
  );
  const twilioObject = {
    twilio,
    client,
    workspace,
    workspaceInfo: {
      activities: {},
      workers: {},
    },
  };

  const activities = await workspace.activities.list();

  activities.forEach((activity) => {
    const workspaceActivities = twilioObject.workspaceInfo.activities;
    workspaceActivities[activity.friendlyName] = activity.sid;
  });

  const workers = await workspace.workers.list();

  workers.forEach((worker) => {
    const workerAttributes = JSON.parse(worker.attributes);
    const workspaceWorkers = twilioObject.workspaceInfo.workers;
    const phoneNumber = workerAttributes.contact_uri;
    workspaceWorkers[phoneNumber] = {
      sid: worker.sid,
      friendlyName: worker.friendlyName,
    };
  });
  expressApp.set('twilio', twilioObject);
};

app.post('/api/sms-incoming', async (req, res) => {
  const responseBody = await taskRouter.handleIncomingSms(req.body);
  res.status(200).send(responseBody);
});

module.exports = {
  setTwilioInfoToApp,
};
