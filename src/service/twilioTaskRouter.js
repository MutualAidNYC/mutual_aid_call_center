const twilio = require('twilio');
const config = require('../config');
const { logger } = require('../loaders/logger');

const { MessagingResponse } = twilio.twiml;

const fetchActivities = async (obj) => {
  const result = {};
  const activities = await obj.workspace.activities.list();
  activities.forEach((activity) => {
    result[activity.friendlyName] = activity.sid;
  });
  return result;
};

const fetchWorkers = async (obj) => {
  const result = {};
  const workers = await obj.workspace.workers.list();
  workers.forEach((worker) => {
    const workerAttributes = JSON.parse(worker.attributes);
    const phoneNumber = workerAttributes.contact_uri;
    result[phoneNumber] = {
      sid: worker.sid,
      friendlyName: worker.friendlyName,
    };
  });
  return result;
};

class TwilioTaskRouter {
  constructor() {
    this.twilio = twilio;
    this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
    this.workspace = this.client.taskrouter.workspaces(
      config.twilio.workspaceSid,
    );
    this.activities = {};
    this.workers = {};
  }

  async init() {
    this.activities = await fetchActivities(this);
    this.workers = await fetchWorkers(this);
  }

  async handleIncomingSms(event) {
    const body = event.Body.toLowerCase().trim();
    const targetActivity = body === 'on' ? 'Available' : 'Offline';

    const { workspace } = this;
    const activitySid = this.activities[targetActivity];
    const worker = this.workers[event.From];

    const updatedWorker = await workspace
      .workers(worker.sid)
      .update({ activitySid });
    logger.info(updatedWorker.activityName);

    const response = new MessagingResponse();
    const reply =
      targetActivity === 'Offline' ? 'You are signed out' : 'You are signed in';
    response.message(`${worker.friendlyName}, ${reply}`);
    return response.toString();
  }

  async handleCallAssignment(event) {
    const workerAttributes = JSON.parse(event.WorkerAttributes);
    const taskAttributes = JSON.parse(event.TaskAttributes);

    const { client } = this;
    const callerId = taskAttributes.called;
    const workerContactNumber = workerAttributes.contact_uri;

    try {
      await client.calls.create({
        to: workerContactNumber,
        from: callerId,
        machineDetection: 'Enable',
        url: `https://${config.hostName}/api/agent-connected`,
      });
    } catch (error) {
      logger.error(error);
    }
  }
}

const taskRouter = new TwilioTaskRouter();

module.exports = taskRouter; // we'll always be working with the same instance
