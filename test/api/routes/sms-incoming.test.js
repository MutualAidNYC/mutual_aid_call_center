const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const taskRouter = require('../../../src/service/twilioTaskRouter');
require('dotenv').config(); // load the local .env file
require('../../../src/api/routes/sms-incoming');
const app = require('../../../src/server');

describe('GET /api/sms-incoming', () => {
  let stub;
  beforeEach(() => {
    stub = sinon.stub(taskRouter, 'handleIncomingSms');
  });
  afterEach(() => {
    stub.restore();
  });
  it('return result of handleIncomingSms with a 200 status', async () => {
    const event = {
      Body: 'On',
      From: '+15556667777',
    };
    const twiml =
      '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Jane Doe, You are signed out</Message></Response>';
    stub.withArgs(event).returns(twiml);
    const res = await request(app).post('/api/sms-incoming').send(event);
    expect(res.status).to.equal(200);
    expect(res.text).to.equal(twiml);
  });
});
