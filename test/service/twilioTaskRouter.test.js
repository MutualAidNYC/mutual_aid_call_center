const { expect } = require('chai');
const sinon = require('sinon');
const taskRouter = require('../../src/service/twilioTaskRouter');

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
});
