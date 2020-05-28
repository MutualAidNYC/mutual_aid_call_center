const twilio = require('twilio');
const config = require('../config');
const { logger } = require('../loaders/logger');
const airtableController = require('./airtableController');

const { MessagingResponse, VoiceResponse } = twilio.twiml;

const fetchActivities = async (obj) => {
  const result = {};
  const activities = await obj.workspace.activities.list();
  activities.forEach((activity) => {
    result[activity.friendlyName] = activity.sid;
  });
  return result;
};

const saveVmToDb = (url, language, phone, callSid) => {
  return airtableController.addVmToDb(callSid, url, language, phone.slice(2));
};

const isLanguagesDifferent = (language1, language2) => {
  return language1.sort().join() !== language2.sort().join();
};

const formatPhoneNumber = (number) => {
  const regex = /(\(|\)|\s|-|‐)/gi;
  return `+1${number.replace(regex, '')}`;
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

  _deleteWorker(workerSid) {
    this.workspace.workers(workerSid).remove();
  }

  async _getPendingReservation(workerSid) {
    const pendingReservations = await this._getWorkersReservations(workerSid, {
      reservationStatus: 'pending',
    });
    return pendingReservations[0];
  }

  _fetchTask(taskSid) {
    return this.workspace.tasks(taskSid).fetch();
  }

  _fetchTaskReservations(taskSid, ReservationStatus) {
    return this.workspace
      .tasks(taskSid)
      .reservations.list({ ReservationStatus });
  }

  async _fetchTaskForCallSid(callSid) {
    const [task] = await this.workspace.tasks.list({
      evaluateTaskAttributes: `call_sid == "${callSid}"`,
    });
    return task;
  }

  async _fetchWorkers() {
    const result = {};
    const workers = await this.workspace.workers.list({ limit: 1000 });
    workers.forEach((worker) => {
      const workerAttributes = JSON.parse(worker.attributes);
      const phoneNumber = workerAttributes.contact_uri;
      result[phoneNumber] = {
        sid: worker.sid,
        friendlyName: worker.friendlyName,
        languages: workerAttributes.languages,
      };
    });
    return result;
  }

  async _updateTask(taskSid, assignmentStatus, reason) {
    const task = await this._fetchTask(taskSid);
    return task.update({ assignmentStatus, reason });
  }

  _getWorkerObj(workerSid) {
    return this.workspace.workers(workerSid);
  }

  _getWorkersReservations(workerSid, reservationCriteriaObj) {
    return this._getWorkerObj(workerSid).reservations.list(
      reservationCriteriaObj,
    );
  }

  _updateCall(callSid, updateObj) {
    return this.client.calls(callSid).update(updateObj);
  }

  _updateReservationStatus(workerSid, reservationSid, newStatus) {
    return this._getWorkerObj(workerSid)
      .reservations(reservationSid)
      .update({ reservationStatus: newStatus });
  }

  _updateWorkerDetails(workerSid, attributes, friendlyName) {
    return this.workspace
      .workers(workerSid)
      .update({ attributes, friendlyName });
  }

  deleteRecording(recordingSid) {
    this.client.recordings(recordingSid).remove();
  }

  async init() {
    this.activities = await fetchActivities(this);
    this.workers = await this._fetchWorkers();
  }

  async handleAgentConnected(event) {
    const response = new VoiceResponse();
    const workerSid = this.workers[event.Called].sid;

    const pendingReservation = await this._getPendingReservation(workerSid);
    if (!pendingReservation) {
      response.say(
        "We're sorry but the caller has disconnected before you got on the phone.",
      );
      response.hangup();
      return response.toString();
    }
    const machineAnswerBys = [
      'machine_end_beep',
      'machine_end_silence',
      'machine_end_other',
      'fax',
      'machine_start',
    ];
    const { taskSid } = pendingReservation;

    if (event.AnsweredBy === 'human') {
      return this._acceptReservationAndbridgeAgent(
        pendingReservation,
        workerSid,
      );
    }
    if (machineAnswerBys.includes(event.AnsweredBy)) {
      this._updateReservationStatus(
        workerSid,
        pendingReservation.sid,
        'rejected',
      );
      response.say('Machine detected, goodbye');
      response.hangup();
      return response.toString();
    }

    // either unknown dection, or AMD is disabled, either way same thing
    const task = await this._fetchTask(taskSid);
    const attributes = JSON.parse(task.attributes);
    const gather = response.gather({
      action: `https://${config.hostName}/api/agent-gather`,
      method: 'POST',
      numDigits: 1,
      actionOnEmptyResult: true,
    });
    gather.say(
      `You are receiving a ${attributes.selected_language} call from Mutual Aid en why see, press any key to accept`,
    );
    response.say("We didn't receive any input. Goodbye!");
    response.hangup();
    return response.toString();
  }

  async _acceptReservationAndbridgeAgent(reservationObj, workerSid) {
    const response = new VoiceResponse();

    this._updateReservationStatus(workerSid, reservationObj.sid, 'accepted');
    const task = await this._fetchTask(reservationObj.taskSid);
    const attributes = JSON.parse(task.attributes);
    const callerCallSid = attributes.call_sid;
    const conferenceRoomName = reservationObj.taskSid;

    response.dial().conference(
      {
        endConferenceOnExit: true,
        statusCallback: `https://${config.hostName}/api/worker-bridge-disconnect`,
        statusCallbackMethod: 'POST',
        statusCallbackEvent: 'end',
      },
      conferenceRoomName,
    );
    const twiml = response.toString();
    this._updateCall(callerCallSid, { twiml });
    return twiml;
  }

  async handleAgentGather(event) {
    const response = new VoiceResponse();
    const workerSid = this.workers[event.Called].sid;
    const pendingReservation = await this._getPendingReservation(workerSid);

    if (!pendingReservation) {
      response.say("We're sorry but the caller has disconnected.");
      response.hangup();
      return response.toString();
    }

    if (event.Digits.length === 0) {
      // no digits detected
      this._updateReservationStatus(
        workerSid,
        pendingReservation.sid,
        'rejected',
      );
      response.say('No key presses were detected, goodbye');
      response.hangup();
      return response.toString();
    }

    return this._acceptReservationAndbridgeAgent(pendingReservation, workerSid);
  }

  async handleCallAssignment(event) {
    if (event.WorkerSid === config.twilio.vmWorkerSid) {
      this.sendToVm(event);
      return;
    }
    const workerAttributes = JSON.parse(event.WorkerAttributes);
    const taskAttributes = JSON.parse(event.TaskAttributes);

    const { client } = this;
    const callerId = taskAttributes.called;
    const workerContactNumber = workerAttributes.contact_uri;
    const options = {
      to: workerContactNumber,
      from: callerId,
      url: `https://${config.hostName}/api/agent-connected`,
    };
    if (config.twilio.isAmdEnabled) {
      options.machineDetection = 'Enable';
    }
    try {
      await client.calls.create(options);
    } catch (error) {
      logger.error(error);
    }
  }

  async handleIncomingSms(event) {
    const body = event.Body.toLowerCase().trim();
    const targetActivity = body === 'on' ? 'Available' : 'Offline';

    const { workspace } = this;
    const activitySid = this.activities[targetActivity];
    const worker = this.workers[event.From];

    await workspace.workers(worker.sid).update({ activitySid });

    const response = new MessagingResponse();
    const reply =
      targetActivity === 'Offline' ? 'You are signed out' : 'You are signed in';
    response.message(`${worker.friendlyName}, ${reply}`);
    return response.toString();
  }

  async handleNewTranscription(event) {
    await airtableController.saveTranscript(
      event.RecordingSid,
      event.TranscriptionText,
    );
    this.client.transcriptions(event.TranscriptionSid).remove();
  }

  async handleVmRecordingEnded(event) {
    const task = await this._fetchTaskForCallSid(event.CallSid);
    const attributes = JSON.parse(task.attributes);
    // logger.info(attributes, 'attributes: ');
    saveVmToDb(
      event.RecordingUrl,
      attributes.selected_language,
      attributes.caller,
      event.RecordingSid,
    );

    this._updateTask(task.sid, 'completed', 'VM recorded');

    const response = new VoiceResponse();
    if (event.CallStatus === 'in-progress') {
      response.say(
        "We have received your voicemail, we'll get back to you soon. Goodbye",
      );
      response.hangup();
    }
    return response.toString();
  }

  handleWorkerBridgeDisconnect(event) {
    const taskSid = event.FriendlyName; // the conferences are using tasks as the room number
    const status = 'completed';
    const reason = event.Reason;
    this._updateTask(taskSid, status, reason);
  }

  async sendToVm(event) {
    const response = new twilio.twiml.VoiceResponse();
    const { isVmEnabled, isEnglishVmTranscriptionEnabled } = config.twilio;
    const isEnglish =
      JSON.parse(event.TaskAttributes).selected_language === 'English';
    await this._updateReservationStatus(
      event.WorkerSid,
      event.ReservationSid,
      'accepted',
    );
    if (isVmEnabled && isEnglishVmTranscriptionEnabled && isEnglish) {
      response.say(
        'Please leave a message at the beep.\nPress the star key when finished.',
      );
      response.record({
        action: `https://${config.hostName}/api/vm-recording-ended`,
        method: 'POST',
        maxLength: 20,
        finishOnKey: '*',
        transcribe: true,
        transcribeCallback: `https://${config.hostName}/api/new-transcription`,
      });
      response.say('I did not receive a recording');
    } else if (isVmEnabled && isEnglishVmTranscriptionEnabled && !isEnglish) {
      response.say(
        'Please leave a message at the beep.\nPress the star key when finished.',
      );
      response.record({
        action: `https://${config.hostName}/api/vm-recording-ended`,
        method: 'POST',
        maxLength: 20,
        finishOnKey: '*',
      });
      response.say('I did not receive a recording');
    } else if (isVmEnabled && !isEnglishVmTranscriptionEnabled) {
      response.say(
        'Please leave a message at the beep.\nPress the star key when finished.',
      );
      response.record({
        action: `https://${config.hostName}/api/vm-recording-ended`,
        method: 'POST',
        maxLength: 20,
        finishOnKey: '*',
      });
      response.say('I did not receive a recording');
    } else {
      response.say(
        'We are sorry, but all of our volunteers are on the line helping other callers. Please call back soon',
      );
      response.hangup();
      this._updateTask(event.TaskSid, 'completed', 'TaskRouter queue time out');
    }

    this._updateCall(JSON.parse(event.TaskAttributes).call_sid, {
      twiml: response.toString(),
    });
  }

  async syncWorkers() {
    // get airtableworkers
    const airtableWokers = await airtableController.fetchAllRecordsFromTable(
      'Volunteers',
      config.airtable.phoneBase,
    );
    const twilioWorkers = await this._fetchWorkers();
    // get workers
    const workers = {};
    // for each airtableworker
    airtableWokers.forEach(async (worker) => {
      if (
        !worker.fields.Phone ||
        !worker.fields.Name ||
        !worker.fields.Languages
      ) {
        // If any values are missing, skip
        return;
      }
      const phone = formatPhoneNumber(worker.fields.Phone);

      workers[phone] = {
        phone,
        languages: worker.fields.Languages || [],
      };

      const updateObj = {
        friendlyName: worker.fields.Name,
        attributes: JSON.stringify({
          languages: worker.fields.Languages || [],
          contact_uri: phone,
        }),
      };

      if (!twilioWorkers[phone]) {
        //   create if need to
        await this.workspace.workers.create(updateObj);
      } else if (
        isLanguagesDifferent(
          twilioWorkers[phone].languages,
          worker.fields.Languages,
        ) ||
        twilioWorkers[phone].friendlyName !== worker.fields.Name
      ) {
        //   update if need to
        await this._updateWorkerDetails(
          twilioWorkers[phone].sid,
          updateObj.attributes,
          updateObj.friendlyName,
        );
      }
    });
    // foreach twilio worker
    Object.keys(twilioWorkers).forEach(async (contactUri) => {
      if (
        !workers[contactUri] &&
        twilioWorkers[contactUri].sid !== config.twilio.vmWorkerSid
      ) {
        // if we didn't see it in airtable list, and it isn't the VM worker

        // eslint-disable-next-line no-await-in-loop
        await this._deleteWorker(twilioWorkers[contactUri].sid);
      }
    });

    //  delete if need to unless its vm
  }
}

const taskRouter = new TwilioTaskRouter();

module.exports = taskRouter; // we'll always be working with the same instance
