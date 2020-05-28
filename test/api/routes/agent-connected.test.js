const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const taskRouter = require('../../../src/service/twilioTaskRouter');
require('dotenv').config(); // load the local .env file
require('../../../src/api/routes/agent-connected');
const app = require('../../../src/server');

describe('GET /api/agent-connected', () => {
  let stub;
  beforeEach(() => {
    stub = sinon.stub(taskRouter, 'handleAgentConnected');
  });
  afterEach(() => {
    stub.restore();
  });
  it('return result of handleAgentConnected with a 200 status', async () => {
    const event = {
      Body: 'On',
      From: '+15556667777',
    };
    const twiml = '<?xml version="1.0" encoding="UTF-8"?></Message></Response>';
    stub.withArgs(event).resolves(twiml);
    const res = await request(app).post('/api/agent-connected').send(event);
    expect(res.status).to.equal(200);
    expect(res.text).to.equal(twiml);
    expect(res.type).to.equal('text/xml');
  });
});
