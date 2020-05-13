const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const taskRouter = require('../../../src/service/twilioTaskRouter');
require('../../../src/api/routes/worker-bridge-disconnect');
const app = require('../../../src/server');

describe('GET /api/worker-bridge-disconnect', () => {
  let stub;
  beforeEach(() => {
    stub = sinon.stub(taskRouter, 'handleWorkerBridgeDisconnect');
  });
  afterEach(() => {
    stub.restore();
  });
  it('return result of handleIncomingSms with a 200 status', async () => {
    const event = {
      Body: 'On',
      From: '+15556667777',
    };
    const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
    stub.withArgs(event).returns(twiml);
    const res = await request(app)
      .post('/api/worker-bridge-disconnect')
      .send(event);
    expect(res.status).to.equal(200);
    expect(res.text).to.equal(twiml);
  });
});
