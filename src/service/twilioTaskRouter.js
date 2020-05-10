const twilio = require('twilio');
const config = require('../config');
// const { logger } = require('../loaders/logger');

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
}

const taskRouter = new TwilioTaskRouter();

module.exports = taskRouter; // we'll always be working with the same instance
