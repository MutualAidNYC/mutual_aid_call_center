const { expect } = require('chai');
const sinon = require('sinon');
const taskrouter = require('../../src/service/twilioTaskRouter');

describe('TwilioTaskRouter class', () => {
  describe('init', () => {
    let activityListStub;
    let workersStub;
    beforeEach(() => {
      activityListStub = sinon.stub(taskrouter.workspace.activities, 'list');
      workersStub = sinon.stub(taskrouter.workspace.workers, 'list');
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
      const activityObj = {
        Offline: 'WAbaloney1',
        Available: 'WAbaloney2',
        Unavailable: 'WAbaloney3',
      };
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
      const workersObj = {
        '+12223334444': { friendlyName: 'Jane Doe', sid: 'WKbaloney1' },
        '+15556667777': { friendlyName: 'Bob Marley', sid: 'WKbaloney2' },
      };
      activityListStub.returns(activities);
      workersStub.returns(workers);
      await taskrouter.init();
      expect(taskrouter.activities).to.eql(activityObj);
      expect(taskrouter.workers).to.eql(workersObj);
    });
  });
});
