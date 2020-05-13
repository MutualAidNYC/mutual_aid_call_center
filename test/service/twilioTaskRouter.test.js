const { expect } = require('chai');
const sinon = require('sinon');
const taskRouter = require('../../src/service/twilioTaskRouter');
const config = require('../../src/config');

describe('TwilioTaskRouter class', () => {
  const activityObj = {
    Offline: 'WAbaloney1',
    Available: 'WAbaloney2',
    Unavailable: 'WAbaloney3',
  };
  const workersObj = {
    '+12223334444': { friendlyName: 'Jane Doe', sid: 'WKbaloney1' },
    '+15556667777': { friendlyName: 'Bob Marley', sid: 'WKbaloney2' },
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
    beforeEach(() => {
      taskRouter.activities = activityObj;
      taskRouter.workers = workersObj;
      createStub = sinon.stub(taskRouter.client.calls, 'create');
    });
    afterEach(() => {
      createStub.restore();
    });
    it('Makes an outbound call to the assigned agent', async () => {
      const event = {
        TaskAttributes:
          '{"from_country":"US","called":"+12223334444","selected_language":"English","to_country":"US","to_city":"BETHPAGE","to_state":"NY","caller_country":"US","call_sid":"CAbaloney","account_sid":"ACbaloney","from_zip":"10601","from":"+15556667777","direction":"inbound","called_zip":"11714","caller_state":"NY","to_zip":"11714","called_country":"US","from_city":"WHITE PLAINS","called_city":"BETHPAGE","caller_zip":"10601","api_version":"2010-04-01","called_state":"NY","from_state":"NY","caller":"+15556667777","caller_city":"WHITE PLAINS","to":"+12223334444"}',
        WorkerAttributes:
          '{"languages":["English"],"contact_uri":"+16667778888"}',
      };
      createStub.resolves(null);
      await taskRouter.handleCallAssignment(event);
      expect(createStub.firstCall.firstArg).to.eql({
        to: '+16667778888',
        from: '+12223334444',
        machineDetection: 'Enable',
        url: `https://${config.hostName}/api/agent-connected`,
      });
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
});
