const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const taskRouter = require('../../../src/service/twilioTaskRouter');
require('../../../src/api/routes/call-assignment');
const app = require('../../../src/server');

describe('GET /api/sms-incoming', () => {
  let stub;
  beforeEach(() => {
    stub = sinon.stub(taskRouter, 'handleCallAssignment');
  });
  afterEach(() => {
    stub.restore();
  });
  it('invoke handleCallAssignment, and return a 200 status', async () => {
    const body = {
      content: 'is here',
    };

    const res = await request(app).post('/api/call-assignment').send(body);
    expect(res.status).to.equal(200);
    expect(stub.firstCall.firstArg).to.eql(body);
  });
});
