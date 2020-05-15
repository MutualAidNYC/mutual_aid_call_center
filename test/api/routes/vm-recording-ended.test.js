const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const taskRouter = require('../../../src/service/twilioTaskRouter');
require('../../../src/api/routes/vm-recording-ended');
const app = require('../../../src/server');

describe('GET /api/vm-recording-ended', () => {
  let stub;
  beforeEach(() => {
    stub = sinon.stub(taskRouter, 'handleVmRecordingEnded');
  });
  afterEach(() => {
    stub.restore();
  });
  it('return result of vm-recording-ended with a 200 status', async () => {
    const event = {
      Body: 'On',
      From: '+15556667777',
    };
    const twiml = '<?xml version="1.0" encoding="UTF-8"?></Response>';
    stub.withArgs(event).resolves(twiml);
    const res = await request(app).post('/api/vm-recording-ended').send(event);
    expect(res.status).to.equal(200);
    expect(res.text).to.equal(twiml);
  });
});
