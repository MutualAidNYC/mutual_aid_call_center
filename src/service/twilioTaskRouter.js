const twilio = require('twilio');
const moment = require('moment-timezone');
const config = require('../config');
const { logger } = require('../loaders/logger');

const { MessagingResponse, VoiceResponse } = twilio.twiml;

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

  async _getPendingReservation(workerSid, status) {
    const pendingReservations = await this._getWorkersReservations(workerSid, {
      reservationStatus: status,
    });
    return pendingReservations[0];
  }

  async handleAgentConnected(event) {
    const response = new VoiceResponse();
    // lets call the assigned worker
    const workerSid = this.workers[event.Called].sid;

    const pendingReservation = await this._getPendingReservation(
      workerSid,
      'pending',
    );
    if (!pendingReservation) {
      response.hangup();
      return response.toString();
    }
    if (event.AnsweredBy === 'human') {
      logger.info('Human detected');
      this._updateReservationStatus(
        workerSid,
        pendingReservation.sid,
        'accepted',
      );

      const { taskSid } = pendingReservation;
      const task = await this._fetchTask(taskSid);
      const callerCallSid = JSON.parse(task.attributes).call_sid;
      const agentCallSid = event.CallSid;

      response.dial().conference({ endConferenceOnExit: true }, callerCallSid);
      this._updateCall(callerCallSid, { twiml: response.toString() });
      this._updateCall(agentCallSid, {
        twiml: response.toString(),
        statusCallback: `https://${config.hostName}/api/worker-bridge-disconnect`,
        statusCallbackMethod: 'POST',
      });
      return '<Response><Pause length="5"/></Response>';
    }
    logger.info('Machine detected');
    this._updateReservationStatus(
      workerSid,
      pendingReservation.sid,
      'rejected',
    );

    return response.hangup().toString();
  }

  async handleWorkerBridgeDisconnect(event) {
    const workerSid = this.workers[event.Called].sid;
    const workspace = this.client.taskrouter.workspaces(
      config.twilio.workspaceSid,
    );

    const worker = workspace.workers(workerSid);

    const reservations = await worker.reservations.list({
      limit: 20,
      reservationStatus: 'accepted',
    });
    if (reservations.length > 0) {
      // lets sort oldest to newest
      reservations.sort((res1, res2) => {
        const res1DateCreated = moment(res1.dateCreated);
        const res2DateCreated = moment(res2.dateCreated);
        return res1DateCreated.isBefore(res2DateCreated) ? 1 : 0;
      });
      const [reservation] = reservations;
      const task = await workspace.tasks(reservation.taskSid).fetch();

      task
        .update({
          assignmentStatus: 'completed',
          reason: 'Call with agent ended after one or the other party hung up',
        })
        .then(() => logger.info('Task marked completed'));
    } else {
      logger.error('No task found!');
    }
    return new VoiceResponse().toString();
  }

  _getWorkerObj(workerSid) {
    return this.workspace.workers(workerSid);
  }

  _getWorkersReservations(workerSid, reservationCriteriaObj) {
    return this._getWorkerObj(workerSid).reservations.list(
      reservationCriteriaObj,
    );
  }

  _updateReservationStatus(workerSid, reservationSid, newStatus) {
    return this._getWorkerObj(workerSid)
      .reservations(reservationSid)
      .update({ reservationStatus: newStatus });
  }

  _fetchTask(taskSid) {
    return this.workspace.tasks(taskSid).fetch();
  }

  _updateCall(callSid, updateObj) {
    return this.client.calls(callSid).update(updateObj);
  }
}

const taskRouter = new TwilioTaskRouter();

module.exports = taskRouter; // we'll always be working with the same instance
