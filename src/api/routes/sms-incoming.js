const twilio = require('twilio');
const app = require('../../server');
const { logger } = require('../../loaders/logger');

const client = twilio(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN);
const setTwilioInfoToApp = async (expressApp) => {
  const workspace = await client.taskrouter.workspaces(
    process.env.WORKSPACE_SID,
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
  const twilioObject = app.get('twilio');
  const event = req.body;
  const body = event.Body.toLowerCase().trim();
  const targetActivity = body === 'on' ? 'Available' : 'Offline';

  const { workspace } = twilioObject;
  const activitySid = twilioObject.workspaceInfo.activities[targetActivity];
  const worker = twilioObject.workspaceInfo.workers[event.From];
  const updatedWorker = await workspace
    .workers(worker.sid)
    .update({ activitySid });
  logger.info(updatedWorker.activityName);

  const response = new twilio.twiml.MessagingResponse();
  const reply =
    targetActivity === 'offline' ? 'You are signed out' : 'You are signed in';
  response.message(`${worker.friendlyName}, ${reply}`);
  res.status(200).send(response.toString());
});

module.exports = {
  setTwilioInfoToApp,
};
