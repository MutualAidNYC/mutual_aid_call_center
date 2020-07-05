const request = require('supertest');
const { expect } = require('chai');
require('../../../src/api/routes/assets');
const app = require('../../../src/server');

describe('GET /assets contents', () => {
  it('delivers an asset with a 200 status', async () => {
    const res = await request(app).get('/assets/receiving_call_in_english.mp3');
    expect(res.status).to.equal(200);
  });
});
