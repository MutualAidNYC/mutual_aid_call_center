const { expect } = require('chai');
const sinon = require('sinon');
const taskRouter = require('../../src/service/twilioTaskRouter');
const config = require('../../src/config');
const airtableController = require('../../src/service/airtableController');

describe('TwilioTaskRouter class', () => {
  const activityObj = {
    Offline: 'WAbaloney1',
    Available: 'WAbaloney2',
    Unavailable: 'WAbaloney3',
  };
  const workersObj = {
    '+12223334444': {
      friendlyName: 'Jane Doe',
      sid: 'WKbaloney1',
      languages: ['Spanish', 'English'],
    },
    '+15556667777': {
      friendlyName: 'Bob Marley',
      sid: 'WKbaloney2',
      languages: ['English'],
    },
  };

  beforeEach(() => {
    taskRouter.workers = {};
    taskRouter.activities = {};
  });

  describe('init', () => {
    let activityListStub;
    let workersStub;
    beforeEach(() => {
      activityListStub = sinon.stub(taskRouter.workspace.activities, 'list');
      workersStub = sinon.stub(taskRouter.workspace.workers, 'list');
    });
    afterEach(() => {
      activityListStub.restore();
      workersStub.restore();
    });
    it('Initializes the class and adds activities and workers', async () => {
      const activities = [
        {
          friendlyName: 'Offline',
          sid: 'WAbaloney1',
        },
        {
          friendlyName: 'Available',
          sid: 'WAbaloney2',
        },
        {
          friendlyName: 'Unavailable',
          sid: 'WAbaloney3',
        },
      ];
      const workers = [
        {
          attributes:
            '{"languages":["Spanish","English"],"contact_uri":"+12223334444"}',
          friendlyName: 'Jane Doe',
          sid: 'WKbaloney1',
        },
        {
          attributes: '{"languages":["English"],"contact_uri":"+15556667777"}',
          friendlyName: 'Bob Marley',
          sid: 'WKbaloney2',
        },
      ];

      activityListStub.returns(activities);
      workersStub.returns(workers);
      await taskRouter.init();
      expect(taskRouter.activities).to.eql(activityObj);
      expect(taskRouter.workers).to.eql(workersObj);
    });
  });

  describe('handleIncomingSms', () => {
    let workersStub;
    const defaultWorkspace = taskRouter.workspace;
    let updateStub;
    beforeEach(() => {
      taskRouter.activities = activityObj;
      taskRouter.workers = workersObj;
      workersStub = sinon.stub();
      updateStub = sinon.stub();
      taskRouter.workspace = {};
      taskRouter.workspace.workers = workersStub;
    });
    afterEach(() => {
      taskRouter.workspace = defaultWorkspace;
    });
    it('Signs in a user', async () => {
      const event = {
        Body: 'On',
        From: '+15556667777',
      };
      workersStub.returns({
        update: updateStub,
      });
      updateStub.returns({
        activityName: 'Available',
      });
      expect(await taskRouter.handleIncomingSms(event)).to.equal(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Bob Marley, You are signed in</Message></Response>',
      );
      expect(workersStub.firstCall.firstArg).to.equal('WKbaloney2');
      expect(updateStub.firstCall.firstArg).to.eql({
        activitySid: 'WAbaloney2',
      });
    });
    it('Signs out a user', async () => {
      const event = {
        Body: 'off',
        From: '+12223334444',
      };
      workersStub.returns({ update: updateStub });
      updateStub.returns({ activityName: 'Offline' });
      expect(await taskRouter.handleIncomingSms(event)).to.equal(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Jane Doe, You are signed out</Message></Response>',
      );
      expect(workersStub.firstCall.firstArg).to.equal('WKbaloney1');
      expect(updateStub.firstCall.firstArg).to.eql({
        activitySid: 'WAbaloney1',
      });
    });
  });

  describe('handleCallAssignment', () => {
    let createStub;
    let sendToVmStub;
    beforeEach(() => {
      taskRouter.activities = activityObj;
      taskRouter.workers = workersObj;
      createStub = sinon.stub(taskRouter.client.calls, 'create');
      sendToVmStub = sinon.stub(taskRouter, 'sendToVm');
    });
    afterEach(() => {
      createStub.restore();
      sendToVmStub.restore();
    });
    describe('Makes an outbound call to the assigned agent if NOT vm', () => {
      it('Enables AMD when isAmdEnabled is true ', async () => {
        config.twilio.isAmdEnabled = true;
        const event = {
          TaskAttributes:
            '{"from_country":"US","called":"+12223334444","selected_language":"English","to_country":"US","to_city":"BETHPAGE","to_state":"NY","caller_country":"US","call_sid":"CAbaloney","account_sid":"ACbaloney","from_zip":"10601","from":"+15556667777","direction":"inbound","called_zip":"11714","caller_state":"NY","to_zip":"11714","called_country":"US","from_city":"WHITE PLAINS","called_city":"BETHPAGE","caller_zip":"10601","api_version":"2010-04-01","called_state":"NY","from_state":"NY","caller":"+15556667777","caller_city":"WHITE PLAINS","to":"+12223334444"}',
          WorkerAttributes:
            '{"languages":["English"],"contact_uri":"+16667778888"}',
          WorkerSid: 'someSID',
        };
        createStub.resolves(null);
        await taskRouter.handleCallAssignment(event);
        expect(createStub.firstCall.firstArg).to.eql({
          to: '+16667778888',
          from: '+12223334444',
          machineDetection: 'Enable',
          url: `https://${config.hostName}/api/agent-connected`,
        });
        expect(sendToVmStub.notCalled).to.be.equal(true);
      });
      it('Disables AMD when isAmdEnabled is false ', async () => {
        config.twilio.isAmdEnabled = false;
        const event = {
          TaskAttributes:
            '{"from_country":"US","called":"+12223334444","selected_language":"English","to_country":"US","to_city":"BETHPAGE","to_state":"NY","caller_country":"US","call_sid":"CAbaloney","account_sid":"ACbaloney","from_zip":"10601","from":"+15556667777","direction":"inbound","called_zip":"11714","caller_state":"NY","to_zip":"11714","called_country":"US","from_city":"WHITE PLAINS","called_city":"BETHPAGE","caller_zip":"10601","api_version":"2010-04-01","called_state":"NY","from_state":"NY","caller":"+15556667777","caller_city":"WHITE PLAINS","to":"+12223334444"}',
          WorkerAttributes:
            '{"languages":["English"],"contact_uri":"+16667778888"}',
          WorkerSid: 'someSID',
        };
        createStub.resolves(null);
        await taskRouter.handleCallAssignment(event);
        expect(createStub.firstCall.firstArg).to.eql({
          to: '+16667778888',
          from: '+12223334444',
          url: `https://${config.hostName}/api/agent-connected`,
        });
        expect(sendToVmStub.notCalled).to.be.equal(true);
      });
    });
    it('Invoke sendToVM if assigned to VM worker', async () => {
      const event = {
        TaskAttributes:
          '{"from_country":"US","called":"+12223334444","selected_language":"English","to_country":"US","to_city":"BETHPAGE","to_state":"NY","caller_country":"US","call_sid":"CAbaloney","account_sid":"ACbaloney","from_zip":"10601","from":"+15556667777","direction":"inbound","called_zip":"11714","caller_state":"NY","to_zip":"11714","called_country":"US","from_city":"WHITE PLAINS","called_city":"BETHPAGE","caller_zip":"10601","api_version":"2010-04-01","called_state":"NY","from_state":"NY","caller":"+15556667777","caller_city":"WHITE PLAINS","to":"+12223334444"}',
        WorkerAttributes:
          '{"languages":["English"],"contact_uri":"+16667778888"}',
        WorkerSid: config.twilio.vmWorkerSid,
      };
      await taskRouter.handleCallAssignment(event);
      expect(createStub.notCalled).to.equal(true);
      expect(sendToVmStub.firstCall.firstArg).to.be.equal(event);
    });
  });

  describe('handleAgentConnected', () => {
    let stubs;
    const createStub = (obj, method) => {
      const stub = sinon.stub(obj, method);
      stubs.push(stub);
      return stub;
    };
    let getWorkersReservationsStub;
    let updateReservationStatusStub;
    let fetchTaskStub;
    let updateCallStub;
    beforeEach(() => {
      taskRouter.activities = activityObj;
      taskRouter.workers = workersObj;
      stubs = [];

      getWorkersReservationsStub = createStub(
        taskRouter,
        '_getWorkersReservations',
      );
      updateReservationStatusStub = createStub(
        taskRouter,
        '_updateReservationStatus',
      );
      fetchTaskStub = createStub(taskRouter, '_fetchTask');
      updateCallStub = createStub(taskRouter, '_updateCall');
    });
    afterEach(() => {
      stubs.forEach((stub) => {
        stub.restore();
      });
    });
    it('Handles answer by human', async () => {
      const event = {
        Called: '+15556667777',
        AnsweredBy: 'human',
        CallSid: 'CAbaloney',
      };
      const reservations = [
        {
          sid: 'WRbalone34',
          taskSid: 'WTbaloneyc4f',
        },
      ];

      const task = {
        attributes:
          '{"from_country":"US","called":"+11112223333","selected_language":"English","to_country":"US","to_city":"BETHPAGE","to_state":"NY","caller_country":"US","call_sid":"CAbaloney2","account_sid":"ACbaloney","from_zip":"10601","from":"+14445556666","direction":"inbound","called_zip":"11714","caller_state":"NY","to_zip":"11714","called_country":"US","from_city":"WHITE PLAINS","called_city":"BETHPAGE","caller_zip":"10601","api_version":"2010-04-01","called_state":"NY","from_state":"NY","caller":"+17778889999","caller_city":"WHITE PLAINS","to":"+10001112222"}',
      };
      const twiml =
        '<?xml version="1.0" encoding="UTF-8"?><Response><Dial><Conference endConferenceOnExit="true">CAbaloney2</Conference></Dial></Response>';

      getWorkersReservationsStub.resolves(reservations);
      fetchTaskStub.resolves(task);

      expect(await taskRouter.handleAgentConnected(event)).to.equal(
        '<Response><Pause length="5"/></Response>',
      );
      /* eslint-disable no-unused-expressions */
      expect(
        getWorkersReservationsStub.calledOnceWith('WKbaloney2', {
          reservationStatus: 'pending',
        }),
      ).to.be.true;
      expect(
        updateReservationStatusStub.calledOnceWith(
          'WKbaloney2',
          reservations[0].sid,
          'accepted',
        ),
      ).to.be.true;
      expect(fetchTaskStub.calledOnceWith(reservations[0].taskSid)).to.be.true;
      expect(updateCallStub.calledWith('CAbaloney2', { twiml })).to.be.true;
      expect(
        updateCallStub.calledWith(event.CallSid, {
          twiml,
          statusCallback: `https://${config.hostName}/api/worker-bridge-disconnect`,
          statusCallbackMethod: 'POST',
        }),
      ).to.be.true;
      /* eslint-enable no-unused-expressions */
    });
    it('Handles answer by non-human', async () => {
      const event = {
        Called: '+15556667777',
        AnsweredBy: 'machine',
        CallSid: 'CAbaloney',
      };
      const reservations = [
        {
          sid: 'WRbaloney',
          taskSid: 'WTbaloney',
        },
      ];

      const task = {
        attributes:
          '{"from_country":"US","called":"+11112223333","selected_language":"English","to_country":"US","to_city":"BETHPAGE","to_state":"NY","caller_country":"US","call_sid":"CAbaloney2","account_sid":"ACbaloney","from_zip":"10601","from":"+14445556666","direction":"inbound","called_zip":"11714","caller_state":"NY","to_zip":"11714","called_country":"US","from_city":"WHITE PLAINS","called_city":"BETHPAGE","caller_zip":"10601","api_version":"2010-04-01","called_state":"NY","from_state":"NY","caller":"+17778889999","caller_city":"WHITE PLAINS","to":"+10001112222"}',
      };

      getWorkersReservationsStub.resolves(reservations);
      fetchTaskStub.resolves(task);

      expect(await taskRouter.handleAgentConnected(event)).to.equal(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>',
      );
      /* eslint-disable no-unused-expressions */
      expect(
        getWorkersReservationsStub.calledOnceWith('WKbaloney2', {
          reservationStatus: 'pending',
        }),
      ).to.be.true;
      expect(
        updateReservationStatusStub.calledOnceWith(
          'WKbaloney2',
          reservations[0].sid,
          'rejected',
        ),
      ).to.be.true;
      expect(fetchTaskStub.notCalled).to.be.true;
      expect(updateCallStub.notCalled).to.be.true;
      expect(updateCallStub.notCalled).to.be.true;
      /* eslint-enable no-unused-expressions */
    });
    it('Handles answer but caller disconnected', async () => {
      const event = {
        Called: '+15556667777',
        AnsweredBy: 'machine',
        CallSid: 'CAbaloney',
      };
      const reservations = [];

      const task = {
        attributes:
          '{"from_country":"US","called":"+11112223333","selected_language":"English","to_country":"US","to_city":"BETHPAGE","to_state":"NY","caller_country":"US","call_sid":"CAbaloney2","account_sid":"ACbaloney","from_zip":"10601","from":"+14445556666","direction":"inbound","called_zip":"11714","caller_state":"NY","to_zip":"11714","called_country":"US","from_city":"WHITE PLAINS","called_city":"BETHPAGE","caller_zip":"10601","api_version":"2010-04-01","called_state":"NY","from_state":"NY","caller":"+17778889999","caller_city":"WHITE PLAINS","to":"+10001112222"}',
      };

      getWorkersReservationsStub.resolves(reservations);
      fetchTaskStub.resolves(task);

      expect(await taskRouter.handleAgentConnected(event)).to.equal(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>',
      );
      /* eslint-disable no-unused-expressions */
      expect(
        getWorkersReservationsStub.calledOnceWith('WKbaloney2', {
          reservationStatus: 'pending',
        }),
      ).to.be.true;
      expect(updateReservationStatusStub.notCalled).to.be.true;
      expect(fetchTaskStub.notCalled).to.be.true;
      expect(updateCallStub.notCalled).to.be.true;
      expect(updateCallStub.notCalled).to.be.true;
      /* eslint-enable no-unused-expressions */
    });
  });

  describe('handleNewTranscription', () => {
    const event = {
      TranscriptionSid: 'TRxxxxxxxxxxxxxx',
      RecordingSid: 'RExxxxxxxxxxxxxxxxx',
      CallStatus: 'completed',
      AccountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      TranscriptionText:
        'My name is John Doe and I am testing out the transcription feature.',
      Caller: '+1234567890',
      TranscriptionStatus: 'completed',
      CallSid: 'CAxxxxxxxxxxxxx',
      To: '+12125551234',
      ForwardedFrom: '+12125555678',
    };
    let saveTranscriptStub;
    let transcriptionsStub;
    let removeStub;
    const originalClient = taskRouter.client;
    beforeEach(() => {
      saveTranscriptStub = sinon.stub(airtableController, 'saveTranscript');
      // transcriptionsStub = sinon.stub(taskRouter.client, 'transcriptions');
      transcriptionsStub = sinon.stub();
      removeStub = sinon.stub();
      taskRouter.client = { transcriptions: transcriptionsStub };
      transcriptionsStub.returns({ remove: removeStub });
    });
    afterEach(() => {
      saveTranscriptStub.restore();
      taskRouter.client = originalClient;
    });
    it('Saves the transcription to airtable on the correct record and deletes the original', async () => {
      await taskRouter.handleNewTranscription(event);
      expect(saveTranscriptStub.firstCall.firstArg).to.equal(
        event.RecordingSid,
      );
      expect(saveTranscriptStub.firstCall.lastArg).to.equal(
        event.TranscriptionText,
      );
      expect(transcriptionsStub.called).to.equal(true);
      expect(transcriptionsStub.firstCall.firstArg).to.equal(
        event.TranscriptionSid,
      );
      expect(removeStub.calledOnce).to.equal(true);
    });
  });

  describe('handleWorkerBridgeDisconnect', () => {
    let getWorkerReservationsStub;
    let updateTaskStub;
    before(() => {
      const reservations = [
        {
          dateUpdated: '2020-05-13T02:27:48.000Z',
          taskSid: 'WTtasksid1',
        },
        {
          dateUpdated: '2020-05-13T02:28:48.000Z',
          taskSid: 'WTtasksid2',
        },
        {
          dateUpdated: '2020-05-13T02:30:48.000Z',
          taskSid: 'WTtasksid3',
        },
      ];
      getWorkerReservationsStub = sinon.stub(
        taskRouter,
        '_getWorkersReservations',
      );
      updateTaskStub = sinon.stub(taskRouter, '_updateTask');
      getWorkerReservationsStub.returns(reservations);
      updateTaskStub.resolves();
    });
    after(() => {
      getWorkerReservationsStub.restore();
      updateTaskStub.restore();
    });
    it('Marks the task as complete', async () => {
      taskRouter.workers = workersObj;
      await taskRouter.handleWorkerBridgeDisconnect({ Called: '+15556667777' });
      expect(updateTaskStub.firstCall.firstArg).to.be.equal('WTtasksid3');
    });
  });

  describe('sendToVM', () => {
    const callSid = 'CAxxxxxxxxxxxx';
    // const statusCallBack = `https://${config.hostName}/api/vm-recording-ended`;
    const englishEvent = {
      TaskAttributes:
        '{"from_country":"US","called":"+12345678901","selected_language":"English","to_country":"US","to_city":"BETHPAGE","to_state":"NY","caller_country":"US","call_sid":"CAxxxxxxxxxxxx","account_sid":"ACxxxxxxxxxxxxxxxx","from_zip":"10601","from":"+12223334444","direction":"inbound","called_zip":"11714","caller_state":"NY","to_zip":"11714","called_country":"US","from_city":"WHITE PLAINS","called_city":"BETHPAGE","caller_zip":"10601","api_version":"2010-04-01","called_state":"NY","from_state":"NY","caller":"+12223334455","caller_city":"WHITE PLAINS","to":"+12223334455"}',
      ReservationSid: 'WRxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      WorkspaceSid: 'WSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      TaskQueueSid: 'WQxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      WorkerSid: config.twilio.vmWorkerSid,

      TaskSid: 'WTxxxxxxxxxxxx',
      WorkerAttributes:
        '{"languages":["English"],"contact_uri":"+12223334567"}',
    };
    const spanishEvent = {
      TaskAttributes:
        '{"from_country":"US","called":"+12345678901","selected_language":"Spanish","to_country":"US","to_city":"BETHPAGE","to_state":"NY","caller_country":"US","call_sid":"CAxxxxxxxxxxxx","account_sid":"ACxxxxxxxxxxxxxxxx","from_zip":"10601","from":"+12223334444","direction":"inbound","called_zip":"11714","caller_state":"NY","to_zip":"11714","called_country":"US","from_city":"WHITE PLAINS","called_city":"BETHPAGE","caller_zip":"10601","api_version":"2010-04-01","called_state":"NY","from_state":"NY","caller":"+12223334455","caller_city":"WHITE PLAINS","to":"+12223334455"}',
      ReservationSid: 'WRxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      WorkspaceSid: 'WSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      TaskQueueSid: 'WQxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      WorkerSid: config.twilio.vmWorkerSid,

      TaskSid: 'WTxxxxxxxxxxxx',
      WorkerAttributes:
        '{"languages":["English"],"contact_uri":"+12223334567"}',
    };
    let updateReservationStub;
    let updateCallStub;
    beforeEach(() => {
      updateReservationStub = sinon.stub(
        taskRouter,
        '_updateReservationStatus',
      );
      updateCallStub = sinon.stub(taskRouter, '_updateCall');
    });
    afterEach(() => {
      updateReservationStub.restore();
      updateCallStub.restore();
    });
    describe('Handles VM enable/disable flags', () => {
      let updateTaskStub;
      beforeEach(() => {
        updateTaskStub = sinon.stub(taskRouter, '_updateTask');
      });
      afterEach(() => {
        updateTaskStub.restore();
      });
      it('When VM, and transcription is enabled and English is selected, Plays a message then triggers a recording with transcription', async () => {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Please leave a message at the beep.\nPress the star key when finished.</Say><Record action="https://${config.hostName}/api/vm-recording-ended" method="POST" maxLength="20" finishOnKey="*" transcribe="true" transcribeCallback="https://${config.hostName}/api/new-transcription"/><Say>I did not receive a recording</Say></Response>`;
        const updateObj = {
          twiml,
        };
        config.twilio.isVmEnabled = true;
        config.twilio.isEnglishVmTranscriptionEnabled = true;
        expect(await taskRouter.sendToVm(englishEvent)).to.equal(undefined);
        expect(updateReservationStub.firstCall.firstArg).to.equal(
          englishEvent.WorkerSid,
        );
        expect(updateReservationStub.firstCall.args[1]).to.equal(
          englishEvent.ReservationSid,
        );
        expect(updateReservationStub.firstCall.args[2]).to.equal('accepted');
        expect(updateCallStub.firstCall.firstArg).to.equal(callSid);
        expect(updateCallStub.firstCall.lastArg).to.eql(updateObj);
        expect(updateTaskStub.notCalled).to.equal(true);
      });
      it('When VM, and transcription is enabled and English is NOT selected, Plays a message then triggers a recording with transcription', async () => {
        config.twilio.isVmEnabled = true;
        const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Please leave a message at the beep.\nPress the star key when finished.</Say><Record action="https://${config.hostName}/api/vm-recording-ended" method="POST" maxLength="20" finishOnKey="*"/><Say>I did not receive a recording</Say></Response>`;
        const updateObj = {
          twiml,
        };
        config.twilio.isVmEnabled = true;
        config.twilio.isEnglishVmTranscriptionEnabled = true;
        expect(await taskRouter.sendToVm(spanishEvent)).to.equal(undefined);
        expect(updateReservationStub.firstCall.firstArg).to.equal(
          spanishEvent.WorkerSid,
        );
        expect(updateReservationStub.firstCall.args[1]).to.equal(
          spanishEvent.ReservationSid,
        );
        expect(updateReservationStub.firstCall.args[2]).to.equal('accepted');
        expect(updateCallStub.firstCall.firstArg).to.equal(callSid);
        expect(updateCallStub.firstCall.lastArg).to.eql(updateObj);
        expect(updateTaskStub.notCalled).to.equal(true);
      });
      it('When VM is disabled, Plays a message then hangs up', async () => {
        config.twilio.isVmEnabled = false;
        const updateObj = {
          twiml:
            '<?xml version="1.0" encoding="UTF-8"?><Response><Say>We are sorry, but all of our volunteers are on the line helping other callers. Please call back soon</Say><Hangup/></Response>',
        };
        expect(await taskRouter.sendToVm(englishEvent)).to.equal(undefined);
        expect(updateReservationStub.firstCall.firstArg).to.equal(
          englishEvent.WorkerSid,
        );
        expect(updateReservationStub.firstCall.args[1]).to.equal(
          englishEvent.ReservationSid,
        );
        expect(updateReservationStub.firstCall.args[2]).to.equal('accepted');
        expect(updateCallStub.firstCall.firstArg).to.equal(callSid);
        expect(updateCallStub.firstCall.lastArg).to.eql(updateObj);
        expect(updateTaskStub.firstCall.args[0]).to.equal(englishEvent.TaskSid);
        expect(updateTaskStub.firstCall.args[1]).to.equal('completed');
        expect(updateTaskStub.firstCall.args[2]).to.equal(
          'TaskRouter queue time out',
        );
      });
    });
  });

  describe('handleVmRecordingEnded', () => {
    let deleteRecordingStub;
    let fetchTaskForCallSidStub;
    let updateTaskStub;
    let addVmToDbstub;
    const RecordingSid = 'REbxxxxxxxxxxxxxxxxxxxxxxxxxx';
    const CallSid = 'CAxxxxxxxxxxxxxxxxxxxxxxxxx';
    const recordingID = 'recXXXXXXXX';
    const task = {
      sid: 'WTxxxxxxxxxxxxxxxxxxxxxxxxxx',
      attributes:
        '{"from_country":"US","called":"+12223334444","selected_language":"English","to_country":"US","to_city":"BETHPAGE","to_state":"NY","caller_country":"US","call_sid":"CAxxxxxxxxxxxxxxxxxx","account_sid":"ACxxxxxxxxxxxxxxx","from_zip":"10601","from":"+15556667777","direction":"inbound","called_zip":"11714","caller_state":"NY","to_zip":"11714","called_country":"US","from_city":"WHITE PLAINS","called_city":"BETHPAGE","caller_zip":"10601","api_version":"2010-04-01","called_state":"NY","from_state":"NY","caller":"+15556667777","caller_city":"WHITE PLAINS","to":"+1222333444"}',
    };
    const RecordingUrl =
      'https://api.twilio.com/2010-04-01/Accounts/ACxxxxxxxxxx/Recordings/RExxxxxxxxxxxxxxxxxxxx';
    beforeEach(() => {
      deleteRecordingStub = sinon.stub(taskRouter, 'deleteRecording');
      fetchTaskForCallSidStub = sinon.stub(taskRouter, '_fetchTaskForCallSid');
      updateTaskStub = sinon.stub(taskRouter, '_updateTask');
      addVmToDbstub = sinon.stub(airtableController, 'addVmToDb');

      addVmToDbstub.resolves(recordingID);
      updateTaskStub.resolves();
      fetchTaskForCallSidStub.withArgs(CallSid).resolves(task);
    });
    afterEach(() => {
      deleteRecordingStub.restore();
      fetchTaskForCallSidStub.restore();
      updateTaskStub.restore();
      addVmToDbstub.restore();
    });
    it('Saves the VM', async () => {
      const event = {
        CallSid,
        CallStatus: 'in-progress',
        RecordingSid,
        RecordingUrl,
      };
      await taskRouter.handleVmRecordingEnded(event);
      expect(addVmToDbstub.firstCall.args[0]).to.equal(RecordingSid);
      expect(addVmToDbstub.firstCall.args[1]).to.equal(RecordingUrl);
      expect(addVmToDbstub.firstCall.args[2]).to.equal('English');
      expect(addVmToDbstub.firstCall.args[3]).to.equal('5556667777');
    });
    it('Marks Task as complete', async () => {
      const event = {
        CallSid,
        CallStatus: 'in-progress',
        RecordingSid,
        RecordingUrl,
      };
      await taskRouter.handleVmRecordingEnded(event);
      expect(updateTaskStub.firstCall.args[0]).to.equal(task.sid);
      expect(updateTaskStub.firstCall.args[1]).to.equal('completed');
      expect(updateTaskStub.firstCall.args[2]).to.equal('VM recorded');
    });
    describe('Call in-progress', () => {
      it('Ends the call', async () => {
        const event = {
          CallSid,
          CallStatus: 'in-progress',
          RecordingSid,
          RecordingUrl,
        };
        expect(await taskRouter.handleVmRecordingEnded(event)).to.equal(
          '<?xml version="1.0" encoding="UTF-8"?><Response><Say>We have received your voicemail, we\'ll get back to you soon. Goodbye</Say><Hangup/></Response>',
        );
      });
    });
    describe('Call completed', () => {
      it('Sends an empty response', async () => {
        const event = {
          CallSid,
          CallStatus: 'completed',
          RecordingSid: 'REbxxxxxxxxxxxxxxxxxxxxxxxxxx',
          RecordingUrl,
        };
        expect(await taskRouter.handleVmRecordingEnded(event)).to.equal(
          '<?xml version="1.0" encoding="UTF-8"?><Response/>',
        );
      });
    });
  });

  describe('_getWorkerObj', () => {
    let stub;
    const originalWorkspace = taskRouter.workspace;
    const fakeWorker = {};
    const sid = 'somesid';
    before(() => {
      stub = sinon.stub();
      taskRouter.workspace = { workers: stub };
      stub.returns(fakeWorker);
    });
    after(() => {
      taskRouter.workspace = originalWorkspace;
    });
    it('Returns a worker object', () => {
      expect(taskRouter._getWorkerObj(sid)).to.equal(fakeWorker);
      expect(stub.firstCall.firstArg).to.equal(sid);
    });
  });

  describe('_getWorkersReservations', () => {
    let getWorkerObjStub;
    const listStub = sinon.stub();
    const reservationObj = { list: listStub };
    const workerObj = { reservations: reservationObj };
    const sid = 'somesid';
    const criteria = {};
    const reservations = [];
    before(() => {
      getWorkerObjStub = sinon.stub(taskRouter, '_getWorkerObj');
      getWorkerObjStub.returns(workerObj);
      listStub.returns(reservations);
    });
    after(() => {
      getWorkerObjStub.restore();
    });
    it('Returns an array of reservations', () => {
      expect(taskRouter._getWorkersReservations(sid, criteria)).to.equal(
        reservations,
      );
      expect(getWorkerObjStub.firstCall.firstArg).to.equal(sid);
      expect(listStub.firstCall.firstArg).to.equal(criteria);
    });
  });

  describe('_updateReservationStatus', () => {
    let getWorkerObjStub;
    before(() => {
      getWorkerObjStub = sinon.stub(taskRouter, '_getWorkerObj');
    });
    after(() => {
      getWorkerObjStub.restore();
    });
    it('Updates a reservation', async () => {
      const reservationStub = sinon.stub();
      const workerObj = { reservations: reservationStub };
      const updateStub = sinon.stub();
      const reservationObj = { update: updateStub };
      const updateObj = {};
      const workerSid = 'someSid';
      const reservationSid = 'someReservationSid';
      const newStatus = 'someStatus';
      const newStatusObj = { reservationStatus: newStatus };

      getWorkerObjStub.returns(workerObj);
      reservationStub.returns(reservationObj);
      updateStub.resolves(updateObj);

      expect(
        await taskRouter._updateReservationStatus(
          workerSid,
          reservationSid,
          newStatus,
        ),
      ).to.equal(updateObj);
      expect(getWorkerObjStub.firstCall.firstArg).to.equal(workerSid);
      expect(reservationStub.firstCall.firstArg).to.equal(reservationSid);
      expect(updateStub.firstCall.firstArg).to.eql(newStatusObj);
    });
  });

  describe('_fetchTask', () => {
    const originalWorkspace = taskRouter.workspace;
    const task = {};
    const taskSid = 'some task sid';
    const tasksStub = sinon.stub();
    const fetchStub = sinon.stub();
    before(() => {
      taskRouter.workspace = { tasks: tasksStub };

      tasksStub.returns({ fetch: fetchStub });
      fetchStub.resolves(task);
    });
    after(() => {
      taskRouter.workspace = originalWorkspace;
    });
    it('Fetches a task', async () => {
      expect(await taskRouter._fetchTask(taskSid)).to.equal(task);
      expect(tasksStub.firstCall.firstArg).to.equal(taskSid);
      // eslint-disable-next-line no-unused-expressions
      expect(fetchStub.calledOnceWithExactly()).to.be.true;
    });
  });

  describe('_updateCall', () => {
    const originalClient = taskRouter.client;
    const callsStub = sinon.stub();
    const updateStub = sinon.stub();
    const callSid = 'some call sid';
    const updateObj = {};
    const updateReturnObj = {};
    let callsObj;
    before(() => {
      taskRouter.client = { calls: callsStub };
      callsObj = { update: updateStub };

      callsStub.returns(callsObj);
      updateStub.resolves(updateReturnObj);
    });
    after(() => {
      taskRouter.client = originalClient;
    });
    it('Fetches a task', async () => {
      expect(await taskRouter._updateCall(callSid, updateObj)).to.equal(
        updateReturnObj,
      );
      expect(callsStub.firstCall.firstArg).to.equal(callSid);
      expect(updateStub.firstCall.firstArg).to.equal(updateObj);
    });
  });

  describe('_updateTask', () => {
    let fetchTaskStub;
    const updateStub = sinon.stub();
    const taskSid = '12345678';
    const status = 'hmmmmmm';
    const reason = "I don't know";
    before(() => {
      fetchTaskStub = sinon.stub(taskRouter, '_fetchTask');
      fetchTaskStub.resolves({ update: updateStub });
    });
    after(() => {
      fetchTaskStub.restore();
    });
    it('Fetches a task', async () => {
      await taskRouter._updateTask(taskSid, status, reason);
      expect(fetchTaskStub.firstCall.firstArg).to.equal(taskSid);
      expect(updateStub.firstCall.firstArg).to.eql({
        assignmentStatus: status,
        reason,
      });
    });
  });

  describe('_fetchTaskReservations', () => {
    const origWorkspace = taskRouter.workspace;
    const tasks = sinon.stub();
    const list = sinon.stub();
    const reservations = [];
    const taskSid = 'WTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
    const status = 'pending';
    before(() => {
      taskRouter.workspace = { tasks };
      tasks.returns({
        reservations: {
          list,
        },
      });
      list.resolves(reservations);
    });

    after(() => {
      taskRouter.workspace = origWorkspace;
    });
    it('Finds and returns reservations', async () => {
      expect(await taskRouter._fetchTaskReservations(taskSid, status)).to.equal(
        reservations,
      );
      expect(tasks.firstCall.firstArg).to.equal(taskSid);
      expect(list.firstCall.firstArg).to.eql({ ReservationStatus: status });
    });
  });

  describe('_fetchTaskForCallSid', () => {
    const task = {
      sid: 'WTxxxxxxxxxxxxxxxxxxxxxxxxxx',
      attributes:
        '{"from_country":"US","called":"+12223334444","selected_language":"English","to_country":"US","to_city":"BETHPAGE","to_state":"NY","caller_country":"US","call_sid":"CAxxxxxxxxx","account_sid":"ACxxxxxxxx","from_zip":"10601","from":"+15556667777","direction":"inbound","called_zip":"11714","caller_state":"NY","to_zip":"11714","called_country":"US","from_city":"WHITE PLAINS","called_city":"BETHPAGE","caller_zip":"10601","api_version":"2010-04-01","called_state":"NY","from_state":"NY","caller":"+15556667777","caller_city":"WHITE PLAINS","to":"+1222333444"}',
    };
    const callSid = 'CAxxxxxxxxxxx';
    const taskParams = { evaluateTaskAttributes: `call_sid == "${callSid}"` };
    let listStub;
    before(() => {
      listStub = sinon.stub(taskRouter.workspace.tasks, 'list');
      listStub.resolves([task]);
    });
    after(() => {
      listStub.restore();
    });
    it('returns the task that matches the call sid', async () => {
      expect(await taskRouter._fetchTaskForCallSid(callSid)).to.equal(task);
      expect(listStub.firstCall.firstArg).to.eql(taskParams);
    });
  });
  describe('deleteRecording', () => {
    const recordingsStub = sinon.stub();
    const removeStub = sinon.stub();
    const recordingSid = 'REXXXXXXXXXXXXXXXXXXX';
    const originalClient = taskRouter.client;
    before(() => {
      recordingsStub.returns({ remove: removeStub });
      taskRouter.client = { recordings: recordingsStub };
    });
    after(() => {
      taskRouter.client = originalClient;
    });
    it('Tells twilio to delete the specified recording', () => {
      taskRouter.deleteRecording(recordingSid);
      expect(recordingsStub.firstCall.firstArg).to.equal(recordingSid);
      expect(removeStub.called).to.equal(true);
    });
  });
  describe('_deleteWorker', () => {
    const workersStub = sinon.stub();
    const removeStub = sinon.stub();
    const workerSid = 'WRxxxxxxxxxxxx';
    const originalWorkSpace = taskRouter.workspace;
    before(() => {
      workersStub.returns({ remove: removeStub });
      taskRouter.workspace = { workers: workersStub };
    });
    after(() => {
      taskRouter.workspace = originalWorkSpace;
    });
    it('Tells twilio to delete the specified worker', () => {
      taskRouter._deleteWorker(workerSid);
      expect(workersStub.firstCall.firstArg).to.equal(workerSid);
      expect(removeStub.called).to.equal(true);
    });
  });
  describe('_UpdateWorkerDetails', () => {
    const workersStub = sinon.stub();
    const upodateStub = sinon.stub();
    const workerSid = 'WRxxxxxxxxxxxx';
    const attributes = 'some json';
    const friendlyName = 'john doe';
    const originalWorkSpace = taskRouter.workspace;
    before(() => {
      workersStub.returns({ update: upodateStub });
      taskRouter.workspace = { workers: workersStub };
    });
    after(() => {
      taskRouter.workspace = originalWorkSpace;
    });
    it('Updates specified worker', () => {
      taskRouter._updateWorkerDetails(workerSid, attributes, friendlyName);
      expect(workersStub.firstCall.firstArg).to.equal(workerSid);
      expect(upodateStub.firstCall.firstArg).to.eql({
        attributes,
        friendlyName,
      });
    });
  });
  describe('syncWorkers', () => {
    let fetchRecordsStub;
    let fetchWorkersStub;
    let updateWorkerDetailsStub;
    let deleteWorkerStub;
    const createStub = sinon.stub();
    const originalWorkSpace = taskRouter.workspace;

    before(() => {
      updateWorkerDetailsStub = sinon.stub(taskRouter, '_updateWorkerDetails');
      deleteWorkerStub = sinon.stub(taskRouter, '_deleteWorker');
      fetchWorkersStub = sinon.stub(taskRouter, '_fetchWorkers');
      fetchRecordsStub = sinon.stub(
        airtableController,
        'fetchAllRecordsFromTable',
      );
      fetchRecordsStub.returns([
        {
          id: 'recXXXXXXXXXX1',
          fields: {
            Name: 'John Doe',
            Phone: '(212) 555-1111',
            Languages: ['English', 'Russian', 'Mandarin', 'Bangla'],
          },
          createdTime: '2020-05-16T11:44:24.000Z',
        },
        {
          id: 'recXXxxxxxxxXXX2',
          fields: {
            Name: 'Jane Doe',
            Phone: '(646) 555-2222',
            Languages: ['English', 'Spanish'],
          },
          createdTime: '2020-05-05T03:55:12.000Z',
        },
      ]);
      fetchWorkersStub.returns({
        undefined: {
          sid: config.twilio.vmWorkerSid,
          friendlyName: 'VM',
        },
        '+16465552222': {
          sid: 'WKxxxxxxxxxxxxxxxxxxxxxxx2',
          friendlyName: 'Jane Doe',
          languages: ['English'],
        },
        '+12223334444': {
          sid: 'WKxxxxxxxxxxxxxxxxxxxxxxx1',
          friendlyName: 'George Bush',
          languages: ['English'],
        },
      });
      // workersStub.returns({ create: createStub });
      taskRouter.workspace = { workers: { create: createStub } };
    });
    after(() => {
      fetchRecordsStub.restore();
      fetchWorkersStub.restore();
      updateWorkerDetailsStub.restore();
      deleteWorkerStub.restore();
      taskRouter.workspace = originalWorkSpace;
    });
    it('Syncs twilio workers with data in airtable', async () => {
      await taskRouter.syncWorkers();
      expect(deleteWorkerStub.calledOnce).to.equal(true);
      expect(createStub.calledOnce).to.equal(true);
      expect(updateWorkerDetailsStub.calledOnce).to.equal(true);
      expect(deleteWorkerStub.firstCall.firstArg).to.equal(
        'WKxxxxxxxxxxxxxxxxxxxxxxx1',
      );
      expect(updateWorkerDetailsStub.firstCall.args[0]).to.equal(
        'WKxxxxxxxxxxxxxxxxxxxxxxx2',
      );
      expect(updateWorkerDetailsStub.firstCall.args[1]).to.equal(
        '{"languages":["English","Spanish"],"contact_uri":"+16465552222"}',
      );
      expect(updateWorkerDetailsStub.firstCall.args[2]).to.equal('Jane Doe');
      expect(createStub.firstCall.firstArg).to.eql({
        attributes:
          '{"languages":["English","Russian","Mandarin","Bangla"],"contact_uri":"+12125551111"}',
        friendlyName: 'John Doe',
      });
    });
  });
});
