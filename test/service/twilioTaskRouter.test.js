const { expect } = require('chai');
const sinon = require('sinon');
const _ = require('lodash');
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
    let sendToVmOrPlayMessageAndDisconnectStub;
    beforeEach(() => {
      taskRouter.activities = activityObj;
      taskRouter.workers = workersObj;
      createStub = sinon.stub(taskRouter.client.calls, 'create');
      sendToVmOrPlayMessageAndDisconnectStub = sinon.stub(
        taskRouter,
        'sendToVmOrPlayMessageAndDisconnect',
      );
    });
    afterEach(() => {
      createStub.restore();
      sendToVmOrPlayMessageAndDisconnectStub.restore();
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
        expect(sendToVmOrPlayMessageAndDisconnectStub.notCalled).to.be.equal(
          true,
        );
      });
      it('Disables AMD when isAmdEnabled is false ', async () => {
        config.twilio.isAmdEnabled = false;
        const event = {
          TaskAttributes:
            '{"from_country":"US","called":"+12223334444","selected_language":"German","to_country":"US","to_city":"BETHPAGE","to_state":"NY","caller_country":"US","call_sid":"CAbaloney","account_sid":"ACbaloney","from_zip":"10601","from":"+15556667777","direction":"inbound","called_zip":"11714","caller_state":"NY","to_zip":"11714","called_country":"US","from_city":"WHITE PLAINS","called_city":"BETHPAGE","caller_zip":"10601","api_version":"2010-04-01","called_state":"NY","from_state":"NY","caller":"+15556667777","caller_city":"WHITE PLAINS","to":"+12223334444"}',
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
        expect(sendToVmOrPlayMessageAndDisconnectStub.notCalled).to.be.equal(
          true,
        );
      });
    });
    it('Invoke sendToVMOrPlayMessageAndDisconnect if assigned to VM worker', async () => {
      const event = {
        TaskAttributes:
          '{"from_country":"US","called":"+12223334444","selected_language":"English","to_country":"US","to_city":"BETHPAGE","to_state":"NY","caller_country":"US","call_sid":"CAbaloney","account_sid":"ACbaloney","from_zip":"10601","from":"+15556667777","direction":"inbound","called_zip":"11714","caller_state":"NY","to_zip":"11714","called_country":"US","from_city":"WHITE PLAINS","called_city":"BETHPAGE","caller_zip":"10601","api_version":"2010-04-01","called_state":"NY","from_state":"NY","caller":"+15556667777","caller_city":"WHITE PLAINS","to":"+12223334444"}',
        WorkerAttributes:
          '{"languages":["English"],"contact_uri":"+16667778888"}',
        WorkerSid: config.twilio.vmWorkerSid,
      };
      await taskRouter.handleCallAssignment(event);
      expect(createStub.notCalled).to.equal(true);
      expect(
        sendToVmOrPlayMessageAndDisconnectStub.firstCall.firstArg,
      ).to.be.equal(event);
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
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Dial><Conference endConferenceOnExit="true" statusCallback="https://${config.hostName}/api/worker-bridge-disconnect" statusCallbackMethod="POST" statusCallbackEvent="end">${reservations[0].taskSid}</Conference></Dial></Response>`;

      getWorkersReservationsStub.resolves(reservations);
      fetchTaskStub.resolves(task);

      expect(await taskRouter.handleAgentConnected(event)).to.equal(twiml);
      expect(
        getWorkersReservationsStub.calledOnceWith('WKbaloney2', {
          reservationStatus: 'pending',
        }),
      ).to.equal(true);
      expect(
        updateReservationStatusStub.calledOnceWith(
          'WKbaloney2',
          reservations[0].sid,
          'accepted',
        ),
      ).to.equal(true);
      expect(fetchTaskStub.calledOnceWith(reservations[0].taskSid)).to.equal(
        true,
      );
      expect(updateCallStub.calledWith('CAbaloney2', { twiml })).to.equal(true);
    });
    describe('Handles answer by non-human', () => {
      it('handles "machine_end_beep', async () => {
        const event = {
          Called: '+15556667777',
          AnsweredBy: 'machine_end_beep',
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
          '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Machine detected, goodbye</Say><Hangup/></Response>',
        );
        expect(
          getWorkersReservationsStub.calledOnceWith('WKbaloney2', {
            reservationStatus: 'pending',
          }),
        ).to.equal(true);
        expect(
          updateReservationStatusStub.calledOnceWith(
            'WKbaloney2',
            reservations[0].sid,
            'rejected',
          ),
        ).to.equal(true);
        expect(fetchTaskStub.notCalled).to.equal(true);
        expect(updateCallStub.notCalled).to.equal(true);
        expect(updateCallStub.notCalled).to.equal(true);
      });
      it('handles "machine_end_silence', async () => {
        const event = {
          Called: '+15556667777',
          AnsweredBy: 'machine_end_silence',
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
          '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Machine detected, goodbye</Say><Hangup/></Response>',
        );
        expect(
          getWorkersReservationsStub.calledOnceWith('WKbaloney2', {
            reservationStatus: 'pending',
          }),
        ).to.equal(true);
        expect(
          updateReservationStatusStub.calledOnceWith(
            'WKbaloney2',
            reservations[0].sid,
            'rejected',
          ),
        ).to.equal(true);
        expect(fetchTaskStub.notCalled).to.equal(true);
        expect(updateCallStub.notCalled).to.equal(true);
        expect(updateCallStub.notCalled).to.equal(true);
      });
      it('handles "machine_end_other', async () => {
        const event = {
          Called: '+15556667777',
          AnsweredBy: 'machine_end_other',
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
          '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Machine detected, goodbye</Say><Hangup/></Response>',
        );
        expect(
          getWorkersReservationsStub.calledOnceWith('WKbaloney2', {
            reservationStatus: 'pending',
          }),
        ).to.equal(true);
        expect(
          updateReservationStatusStub.calledOnceWith(
            'WKbaloney2',
            reservations[0].sid,
            'rejected',
          ),
        ).to.equal(true);
        expect(fetchTaskStub.notCalled).to.equal(true);
        expect(updateCallStub.notCalled).to.equal(true);
        expect(updateCallStub.notCalled).to.equal(true);
      });
      it('handles "fax', async () => {
        const event = {
          Called: '+15556667777',
          AnsweredBy: 'fax',
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
          '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Machine detected, goodbye</Say><Hangup/></Response>',
        );
        expect(
          getWorkersReservationsStub.calledOnceWith('WKbaloney2', {
            reservationStatus: 'pending',
          }),
        ).to.equal(true);
        expect(
          updateReservationStatusStub.calledOnceWith(
            'WKbaloney2',
            reservations[0].sid,
            'rejected',
          ),
        ).to.equal(true);
        expect(fetchTaskStub.notCalled).to.equal(true);
        expect(updateCallStub.notCalled).to.equal(true);
        expect(updateCallStub.notCalled).to.equal(true);
      });
      it('handles "machine_start', async () => {
        const event = {
          Called: '+15556667777',
          AnsweredBy: 'machine_start',
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
          '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Machine detected, goodbye</Say><Hangup/></Response>',
        );
        expect(
          getWorkersReservationsStub.calledOnceWith('WKbaloney2', {
            reservationStatus: 'pending',
          }),
        ).to.equal(true);
        expect(
          updateReservationStatusStub.calledOnceWith(
            'WKbaloney2',
            reservations[0].sid,
            'rejected',
          ),
        ).to.equal(true);
        expect(fetchTaskStub.notCalled).to.equal(true);
        expect(updateCallStub.notCalled).to.equal(true);
        expect(updateCallStub.notCalled).to.equal(true);
      });
    });
    describe('Handles unknown or no AMD enabled', () => {
      it('handles "unknown', async () => {
        const event = {
          Called: '+15556667777',
          AnsweredBy: 'unknown',
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
            '{"from_country":"US","called":"+11112223333","selected_language":"German","to_country":"US","to_city":"BETHPAGE","to_state":"NY","caller_country":"US","call_sid":"CAbaloney2","account_sid":"ACbaloney","from_zip":"10601","from":"+14445556666","direction":"inbound","called_zip":"11714","caller_state":"NY","to_zip":"11714","called_country":"US","from_city":"WHITE PLAINS","called_city":"BETHPAGE","caller_zip":"10601","api_version":"2010-04-01","called_state":"NY","from_state":"NY","caller":"+17778889999","caller_city":"WHITE PLAINS","to":"+10001112222"}',
        };

        getWorkersReservationsStub.resolves(reservations);
        fetchTaskStub.resolves(task);

        expect(await taskRouter.handleAgentConnected(event)).to.equal(
          `<?xml version="1.0" encoding="UTF-8"?><Response><Gather action="https://${config.hostName}/api/agent-gather" method="POST" numDigits="1" actionOnEmptyResult="true"><Play>https://${config.hostName}/assets/receiving_call_in_german.mp3</Play></Gather></Response>`,
        );
        expect(
          getWorkersReservationsStub.calledOnceWith('WKbaloney2', {
            reservationStatus: 'pending',
          }),
        ).to.equal(true);
        expect(fetchTaskStub.calledOnceWith(reservations[0].taskSid)).to.equal(
          true,
        );
        expect(updateCallStub.notCalled).to.equal(true);
      });
      it('handles AMD not used', async () => {
        const event = {
          Called: '+15556667777',
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
            '{"from_country":"US","called":"+11112223333","selected_language":"German","to_country":"US","to_city":"BETHPAGE","to_state":"NY","caller_country":"US","call_sid":"CAbaloney2","account_sid":"ACbaloney","from_zip":"10601","from":"+14445556666","direction":"inbound","called_zip":"11714","caller_state":"NY","to_zip":"11714","called_country":"US","from_city":"WHITE PLAINS","called_city":"BETHPAGE","caller_zip":"10601","api_version":"2010-04-01","called_state":"NY","from_state":"NY","caller":"+17778889999","caller_city":"WHITE PLAINS","to":"+10001112222"}',
        };

        getWorkersReservationsStub.resolves(reservations);
        fetchTaskStub.resolves(task);

        expect(await taskRouter.handleAgentConnected(event)).to.equal(
          `<?xml version="1.0" encoding="UTF-8"?><Response><Gather action="https://${config.hostName}/api/agent-gather" method="POST" numDigits="1" actionOnEmptyResult="true"><Play>https://${config.hostName}/assets/receiving_call_in_german.mp3</Play></Gather></Response>`,
        );
        expect(
          getWorkersReservationsStub.calledOnceWith('WKbaloney2', {
            reservationStatus: 'pending',
          }),
        ).to.equal(true);
        expect(fetchTaskStub.calledOnceWith(reservations[0].taskSid)).to.equal(
          true,
        );
        expect(updateCallStub.notCalled).to.equal(true);
      });
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
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>We\'re sorry but the caller has disconnected before you got on the phone.</Say><Hangup/></Response>',
      );
      expect(
        getWorkersReservationsStub.calledOnceWith('WKbaloney2', {
          reservationStatus: 'pending',
        }),
      ).to.equal(true);
      expect(updateReservationStatusStub.notCalled).to.equal(true);
      expect(fetchTaskStub.notCalled).to.equal(true);
      expect(updateCallStub.notCalled).to.equal(true);
      expect(updateCallStub.notCalled).to.equal(true);
    });
  });

  describe('handelAgentGather', () => {
    let getPendingReservationStub;
    let acceptReservationAndbridgeAgentStub;
    let updateReservationStatusStub;
    beforeEach(() => {
      getPendingReservationStub = sinon.stub(
        taskRouter,
        '_getPendingReservation',
      );
      acceptReservationAndbridgeAgentStub = sinon.stub(
        taskRouter,
        '_acceptReservationAndbridgeAgent',
      );
      updateReservationStatusStub = sinon.stub(
        taskRouter,
        '_updateReservationStatus',
      );
      taskRouter.workers = workersObj;
    });
    afterEach(() => {
      getPendingReservationStub.restore();
      acceptReservationAndbridgeAgentStub.restore();
      updateReservationStatusStub.restore();
    });
    describe('When a DTMF tone "1" is detected', () => {
      const event = {
        CallSid: 'CAxxxxxxxxxxxxxxxxxx',
        CallStatus: 'in-progress',
        Called: '+12223334444',
        Digits: '1',
        FinishedOnKey: '',
      };
      it('Bridges if the caller is still on the line', async () => {
        const reservation = {
          sid: 'WRbalone34',
          taskSid: 'WTbaloneyc4f',
        };
        getPendingReservationStub.resolves(reservation);
        acceptReservationAndbridgeAgentStub.resolves('some twiml');

        expect(await taskRouter.handleAgentGather(event)).to.equal(
          'some twiml',
        );
        expect(getPendingReservationStub.firstCall.firstArg).to.equal(
          workersObj[event.Called].sid,
        );
        expect(acceptReservationAndbridgeAgentStub.firstCall.firstArg).to.equal(
          reservation,
        );
        expect(acceptReservationAndbridgeAgentStub.firstCall.lastArg).to.equal(
          workersObj[event.Called].sid,
        );
        expect(updateReservationStatusStub.notCalled).to.equal(true);
      });
      it('Plays a message if the caller has disconnected and hangs up', async () => {
        getPendingReservationStub.resolves(undefined);

        expect(await taskRouter.handleAgentGather(event)).to.equal(
          `<?xml version="1.0" encoding="UTF-8"?><Response><Play>https://${config.hostName}/assets/caller_disconnected.mp3</Play><Hangup/></Response>`,
        );
        expect(getPendingReservationStub.firstCall.firstArg).to.equal(
          workersObj[event.Called].sid,
        );
        expect(acceptReservationAndbridgeAgentStub.notCalled).to.equal(true);
        expect(updateReservationStatusStub.notCalled).to.equal(true);
      });
    });
    describe('When no DTMF tones are detected', () => {
      const event = {
        CallSid: 'CAxxxxxxxxxxxxxxxxxx',
        CallStatus: 'in-progress',
        Called: '+12223334444',
        Digits: '',
        FinishedOnKey: '',
      };
      it('Rejects the reservation plays a message and hangs up', async () => {
        const reservation = {
          sid: 'WRbalone34',
          taskSid: 'WTbaloneyc4f',
        };
        getPendingReservationStub.resolves(reservation);

        expect(await taskRouter.handleAgentGather(event)).to.equal(
          `<?xml version="1.0" encoding="UTF-8"?><Response><Play>https://${config.hostName}/assets/no_response.mp3</Play><Hangup/></Response>`,
        );
        expect(getPendingReservationStub.firstCall.firstArg).to.equal(
          workersObj[event.Called].sid,
        );
        expect(acceptReservationAndbridgeAgentStub.notCalled).to.equal(true);
        expect(updateReservationStatusStub.firstCall.args[0]).to.equal(
          workersObj[event.Called].sid,
        );
        expect(updateReservationStatusStub.firstCall.args[1]).to.equal(
          'WRbalone34',
        );
        expect(updateReservationStatusStub.firstCall.args[2]).to.equal(
          'rejected',
        );
      });
    });
    describe('When a DTMF "9" is detected', () => {
      const event = {
        CallSid: 'CAxxxxxxxxxxxxxxxxxx',
        CallStatus: 'in-progress',
        Called: '+12223334444',
        Digits: '9',
        FinishedOnKey: '',
      };
      it('Rejects the reservation plays a message and hangs up', async () => {
        const reservation = {
          sid: 'WRbalone34',
          taskSid: 'WTbaloneyc4f',
        };
        getPendingReservationStub.resolves(reservation);

        expect(await taskRouter.handleAgentGather(event)).to.equal(
          `<?xml version="1.0" encoding="UTF-8"?><Response><Play>https://${config.hostName}/assets/send_call_to_next_volunteer.mp3</Play><Hangup/></Response>`,
        );
        expect(getPendingReservationStub.firstCall.firstArg).to.equal(
          workersObj[event.Called].sid,
        );
        expect(acceptReservationAndbridgeAgentStub.notCalled).to.equal(true);
        expect(updateReservationStatusStub.firstCall.args[0]).to.equal(
          workersObj[event.Called].sid,
        );
        expect(updateReservationStatusStub.firstCall.args[1]).to.equal(
          'WRbalone34',
        );
        expect(updateReservationStatusStub.firstCall.args[2]).to.equal(
          'rejected',
        );
      });
    });
    describe('When a DTMF other than "1" or "9" is detected', () => {
      const event = {
        CallSid: 'CAxxxxxxxxxxxxxxxxxx',
        CallStatus: 'in-progress',
        Called: '+12223334444',
        Digits: '6',
        FinishedOnKey: '',
      };
      it('Plays a message indicating invalid entry and re-prompt', async () => {
        const reservation = {
          sid: 'WRbalone34',
          taskSid: 'WTbaloneyc4f',
        };
        getPendingReservationStub.resolves(reservation);

        expect(await taskRouter.handleAgentGather(event)).to.equal(
          `<?xml version="1.0" encoding="UTF-8"?><Response><Play>https://${config.hostName}/assets/invalid_entry.mp3</Play><Redirect>https://${config.hostName}/api/agent-connected</Redirect></Response>`,
        );
        expect(getPendingReservationStub.firstCall.firstArg).to.equal(
          workersObj[event.Called].sid,
        );
        expect(acceptReservationAndbridgeAgentStub.notCalled).to.equal(true);
        expect(updateReservationStatusStub.notCalled).to.equal(true);
      });
    });
    describe('When agent disconnects', () => {
      const event = {
        CallSid: 'CAxxxxxxxxxxxxxxxxxx',
        CallStatus: 'completed',
        Called: '+12223334444',
        Digits: '',
        FinishedOnKey: '',
      };
      it('it rejects the call', async () => {
        const reservation = {
          sid: 'WRbalone34',
          taskSid: 'WTbaloneyc4f',
        };
        getPendingReservationStub.resolves(reservation);

        expect(await taskRouter.handleAgentGather(event)).to.equal(
          `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`,
        );
        expect(getPendingReservationStub.firstCall.firstArg).to.equal(
          workersObj[event.Called].sid,
        );
        expect(acceptReservationAndbridgeAgentStub.notCalled).to.equal(true);
        expect(updateReservationStatusStub.firstCall.args[0]).to.equal(
          workersObj[event.Called].sid,
        );
        expect(updateReservationStatusStub.firstCall.args[1]).to.equal(
          'WRbalone34',
        );
        expect(updateReservationStatusStub.firstCall.args[2]).to.equal(
          'rejected',
        );
      });
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
    const event = {
      FriendlyName: 'WTxxxxxxxxxxxxxxxxxxxxxxxx',
      CallSidEndingConference: 'CAxxxxxxxxxx',
      ConferenceSid: 'CFxxxxxxxxxxxxxxxxxxxxxx',
      StatusCallbackEvent: 'conference-end',
      Reason:
        'Participant CAxxxxxxxxxxxx with endConferenceOnExit left the conference',
    };
    let updateTaskStub;
    before(() => {
      updateTaskStub = sinon.stub(taskRouter, '_updateTask');
      updateTaskStub.resolves();
    });
    after(() => {
      updateTaskStub.restore();
    });
    it('Marks the task as complete', () => {
      taskRouter.workers = workersObj;
      taskRouter.handleWorkerBridgeDisconnect(event);
      expect(updateTaskStub.firstCall.args[0]).to.be.equal(event.FriendlyName);
      expect(updateTaskStub.firstCall.args[1]).to.be.equal('completed');
      expect(updateTaskStub.firstCall.args[2]).to.be.equal(event.Reason);
    });
  });

  describe('sendToVMOrPlayMessageAndDisconnect', () => {
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
        expect(
          await taskRouter.sendToVmOrPlayMessageAndDisconnect(englishEvent),
        ).to.equal(undefined);
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
        expect(
          await taskRouter.sendToVmOrPlayMessageAndDisconnect(spanishEvent),
        ).to.equal(undefined);
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
          twiml: `<?xml version="1.0" encoding="UTF-8"?><Response><Play>https://${config.hostName}/assets/no_volunteers_available_in_spanish.mp3</Play><Hangup/></Response>`,
        };
        expect(
          await taskRouter.sendToVmOrPlayMessageAndDisconnect(spanishEvent),
        ).to.equal(undefined);
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
      expect(fetchStub.calledOnceWithExactly()).to.equal(true);
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
    let workersStub;
    let updateStub;
    const workerSid = 'WRxxxxxxxxxxxx';
    const activitySid = 'WAxxxxxxxxx';
    const attributes = 'some json';
    const friendlyName = 'john doe';
    const originalWorkSpace = taskRouter.workspace;
    beforeEach(() => {
      workersStub = sinon.stub();
      updateStub = sinon.stub();
      workersStub.returns({ update: updateStub });
      taskRouter.workspace = { workers: workersStub };
    });
    afterEach(() => {
      taskRouter.workspace = originalWorkSpace;
    });
    it('Updates specified worker, without activity', () => {
      taskRouter._updateWorkerDetails(workerSid, attributes, friendlyName);
      expect(workersStub.firstCall.firstArg).to.equal(workerSid);
      expect(updateStub.firstCall.firstArg).to.eql({
        attributes,
        friendlyName,
      });
    });
    it('Updates specified worker, with activity', () => {
      taskRouter._updateWorkerDetails(
        workerSid,
        attributes,
        friendlyName,
        activitySid,
      );
      expect(workersStub.firstCall.firstArg).to.equal(workerSid);
      expect(updateStub.firstCall.firstArg).to.eql({
        attributes,
        friendlyName,
        activitySid,
      });
    });
  });
  describe('syncWorkers', () => {
    let fetchRecordsStub;
    let fetchWorkersStub;
    let updateWorkerDetailsStub;
    let deleteWorkerStub;
    let updateRecordsStub;
    const createStub = sinon.stub();
    const originalWorkSpace = taskRouter.workspace;
    const newWorkerSid = 'WKxxxxxxxxxxxxxxxxxxxxxxx3';
    before(() => {
      createStub.resolves({ sid: newWorkerSid });
      updateWorkerDetailsStub = sinon.stub(taskRouter, '_updateWorkerDetails');
      deleteWorkerStub = sinon.stub(taskRouter, '_deleteWorker');
      fetchWorkersStub = sinon.stub(taskRouter, '_fetchWorkers');
      fetchRecordsStub = sinon.stub(
        airtableController,
        'fetchAllRecordsFromTable',
      );
      updateRecordsStub = sinon.stub(airtableController, 'updateRecords');
      fetchRecordsStub.returns([
        {
          id: 'recXXXXXXXXXX1',
          fields: {
            Name: 'John Doe',
            Phone: '(212) 555-1111',
            WorkerSid: null,
            uniqueName: 'John Doe-recXXXXXXXXXX1',
          },
          createdTime: '2020-05-16T11:44:24.000Z',
        },
        {
          id: 'recXXxxxxxxxXXX2',
          fields: {
            Name: 'Jane Doe',
            Phone: '(646) 555-2222',
            WorkerSid: 'WKxxxxxxxxxxxxxxxxxxxxxxx2',
            uniqueName: 'Jane Doe-recXXxxxxxxxXXX2',
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
      expect(updateWorkerDetailsStub.called).to.equal(false);
      expect(deleteWorkerStub.firstCall.firstArg).to.equal(
        'WKxxxxxxxxxxxxxxxxxxxxxxx1',
      );
      expect(createStub.firstCall.firstArg).to.eql({
        attributes: '{"languages":["English"],"contact_uri":"+12125551111"}',
        friendlyName: 'John Doe-recXXXXXXXXXX1',
      });
      expect(updateRecordsStub.firstCall.args[0]).to.equal(
        config.airtable.phoneBase,
      );
      expect(updateRecordsStub.firstCall.args[1]).to.equal('Volunteers');
      expect(updateRecordsStub.firstCall.args[2]).to.eql([
        {
          id: 'recXXXXXXXXXX1',
          fields: {
            WorkerSid: newWorkerSid,
          },
        },
      ]);
    });
  });
  describe('startShift', () => {
    let clock;
    let fetchAllRecords;
    let fetchWorkersBySidStub;
    let updateWorkerDetailsStub;
    let shuffleStub;
    let sendTextSub;
    let createRecordsStub;
    const oldActivities = taskRouter.activities;
    const startTxtMessage =
      'Mutual Aid NYC thanks you for volunteering! Your Tuesday 5PM - 8PM shift is starting now. If you need to temporarily pause incoming calls, please respond to this text message with "pause calls"';
    const volunteerRecords = [
      {
        id: 'recxxxxxxxxx1',
        fields: {
          Name: 'John Doe',
          Phone: '(202) 555-5555',
          'Tuesday 5PM - 8PM': ['Spanish', 'English'],
          WorkerSid: 'WKxxxxxxxxx1',
        },
      },
      {
        id: 'recxxxxxxxxxxxx2',
        fields: {
          Name: 'Jane Doe',
          Phone: '(201) 555-5555',
          'Tuesday 5PM - 8PM': ['Spanish', 'English'],
          WorkerSid: 'WKxxxxxxxxx2',
        },
      },
    ];
    const workers = {
      WKxxxxxxxxx1: {
        activityName: 'Offline',
        available: false,
        friendlyName: 'John Doe',
        sid: 'WKxxxxxxxxx1',
        attributes: '{"languages":["English"],"contact_uri":"+15551111111"}',
      },
      WKxxxxxxxxx2: {
        activityName: 'available',
        available: false,
        friendlyName: 'Jane Doe',
        sid: 'WKxxxxxxxxx2',
        attributes: '{"languages":["English"],"contact_uri":"+15552222222"}',
      },
      WKXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX3: {
        activityName: 'available',
        available: false,
        friendlyName: 'NewWorker',
        sid: 'WKXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX3',
        attributes: '{"languages":["English"],"contact_uri":"+15553333333"}',
      },
      WKXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX4: {
        activityName: 'Offline',
        available: false,
        friendlyName: 'NewWorker2',
        sid: 'WKXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX4',
        attributes: '{"languages":["English"],"contact_uri":"+15554444444"}',
      },
    };
    beforeEach(() => {
      clock = sinon.useFakeTimers(1594770033810); // tuesday in eastern tz
      fetchAllRecords = sinon.stub(
        airtableController,
        'fetchAllRecordsFromTable',
      );
      fetchAllRecords.resolves(volunteerRecords);

      fetchWorkersBySidStub = sinon.stub(taskRouter, '_fetchWorkersBySid');
      fetchWorkersBySidStub.resolves(workers);

      taskRouter.activities = { Available: 'WAxxx1', Offline: 'WAxxx2' };
      updateWorkerDetailsStub = sinon.stub(taskRouter, '_updateWorkerDetails');
      shuffleStub = sinon.stub(_, 'shuffle');
      shuffleStub.returns(volunteerRecords);
      sendTextSub = sinon.stub(taskRouter, '_sendTextMessage');
      createRecordsStub = sinon.stub(airtableController, 'createRecords');
    });

    afterEach(() => {
      clock.restore();
      fetchAllRecords.restore();
      fetchWorkersBySidStub.restore();
      taskRouter.activities = oldActivities;
      updateWorkerDetailsStub.restore();
      shuffleStub.restore();
      sendTextSub.restore();
      createRecordsStub.restore();
    });
    it('Signs in (and syncs their properties) new workers and signs out old workers', async () => {
      await taskRouter.startShift('5PM - 8PM');
      expect(fetchAllRecords.firstCall.args[0]).to.equal('Volunteers');
      expect(fetchAllRecords.firstCall.args[1]).to.equal(
        config.airtable.phoneBase,
      );
      expect(fetchAllRecords.firstCall.args[2]).to.equal('Tuesday 5PM - 8PM');
      expect(shuffleStub.called).to.equal(true);
      expect(updateWorkerDetailsStub.firstCall.args[0]).to.equal(
        'WKxxxxxxxxx1',
      );
      expect(updateWorkerDetailsStub.firstCall.args[1]).to.equal(
        '{"languages":["Spanish","English"],"contact_uri":"+12025555555"}',
      );
      expect(updateWorkerDetailsStub.firstCall.args[2]).to.equal(null);
      expect(updateWorkerDetailsStub.firstCall.args[3]).to.equal('WAxxx1');

      expect(sendTextSub.firstCall.args[0]).to.equal('+12025555555');
      expect(sendTextSub.firstCall.args[1]).to.equal(startTxtMessage);
      expect(sendTextSub.secondCall.args[0]).to.equal('+12015555555');
      expect(sendTextSub.secondCall.args[1]).to.equal(startTxtMessage);

      expect(updateWorkerDetailsStub.secondCall.args[0]).to.equal(
        'WKxxxxxxxxx2',
      );
      expect(updateWorkerDetailsStub.secondCall.args[1]).to.equal(
        '{"languages":["Spanish","English"],"contact_uri":"+12015555555"}',
      );
      // const x = updateWorkerDetailsStub.getCalls();
      expect(updateWorkerDetailsStub.secondCall.args[2]).to.equal(null);
      expect(updateWorkerDetailsStub.secondCall.args[3]).to.equal(undefined);

      expect(updateWorkerDetailsStub.getCalls()[2].args[0]).to.equal(
        'WKXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX3',
      );
      expect(updateWorkerDetailsStub.getCalls()[2].args[1]).to.equal(null);

      expect(updateWorkerDetailsStub.getCalls()[2].args[2]).to.equal(null);
      expect(updateWorkerDetailsStub.getCalls()[2].args[3]).to.equal('WAxxx2');
      expect(updateWorkerDetailsStub.getCalls().length).to.equal(3);

      expect(sendTextSub.thirdCall.args[0]).to.equal('+15553333333');
      expect(sendTextSub.thirdCall.args[1]).to.equal(
        'Thanks again for volunteering, your shift has ended. You should receive no more new calls.',
      );

      expect(createRecordsStub.firstCall.args[0]).to.equal(
        config.airtable.phoneBase,
      );
      expect(createRecordsStub.firstCall.args[1]).to.equal(
        'Volunteer Availability Log',
      );
      expect(createRecordsStub.firstCall.args[2]).to.eql([
        {
          fields: {
            Availability: 'Available',
            Reason: 'Shift Start',
            'Unique Name': 'John Doe',
          },
        },
        {
          fields: {
            Availability: 'Unavailable',
            Reason: 'Shift End',
            'Unique Name': 'NewWorker',
          },
        },
      ]);
    });
  });

  describe('_fetchWorkersBySid', () => {
    let listStub;
    const worker1 = { sid: 1 };
    const worker2 = { sid: 2 };
    beforeEach(() => {
      listStub = sinon.stub(taskRouter.workspace.workers, 'list');
      listStub.resolves([worker1, worker2]);
    });
    afterEach(() => {
      listStub.restore();
    });
    it('returns all the workers in an object with the sid as the key', async () => {
      expect(await taskRouter._fetchWorkersBySid()).to.eql({
        1: worker1,
        2: worker2,
      });
    });
  });

  describe('_sendTextMessage', () => {
    const originalClient = taskRouter.client;
    const createStub = sinon.stub();
    const phone = '+15551234567';
    const message = 'what up yo?';
    beforeEach(() => {
      taskRouter.client = {
        messages: {
          create: createStub,
        },
      };
    });

    afterEach(() => {
      taskRouter.client = originalClient;
    });
    it('Sends a message to the phone provided, from the caller id in config', () => {
      taskRouter._sendTextMessage(phone, message);

      expect(createStub.firstCall.firstArg).to.eql({
        from: config.twilio.callerId,
        body: message,
        to: phone,
      });
    });
  });
});
