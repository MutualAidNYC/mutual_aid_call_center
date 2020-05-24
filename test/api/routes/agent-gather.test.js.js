const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const taskRouter = require('../../../src/service/twilioTaskRouter');
require('../../../src/api/routes/agent-gather');
const app = require('../../../src/server');

describe('GET /api/agent-gather', () => {
  let stub;
  beforeEach(() => {
    stub = sinon.stub(taskRouter, 'handleAgentGather');
  });
  afterEach(() => {
    stub.restore();
  });
  it('Invokes handleAgentGather', async () => {
    const event = {
      Body: 'On',
      From: '+15556667777',
    };
    const res = await request(app).post('/api/agent-gather').send(event);
    expect(res.status).to.equal(200);
    expect(stub.calledOnce).to.equal(true);
  });
});
