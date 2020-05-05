const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const {
  transformSchedule,
  getScheduleFromBase,
} = require('../routes/api/schedule');
require('dotenv').config(); // load the local .env file

const app = require('../server');

const sampleInput = JSON.parse(
  `{"records":[{"id":"reci45bsbMo3x7yEJ","fields":{"Open":"2020-05-02T17:00:00.000Z","Close":"2020-05-02T22:00:00.000Z","Day":"Monday","Last Modified":"2020-05-02T23:04:16.000Z","Created Time":"2020-05-01T00:35:45.000Z"},"createdTime":"2020-05-01T00:35:45.000Z"},{"id":"rec8LgQYpRk9vQesO","fields":{"Open":"2020-05-02T17:00:00.000Z","Close":"2020-05-02T22:00:00.000Z","Day":"Tuesday","Last Modified":"2020-05-02T23:04:18.000Z","Created Time":"2020-05-01T00:35:53.000Z"},"createdTime":"2020-05-01T00:35:53.000Z"},{"id":"recql2OSnciW3ex0p","fields":{"Open":"2020-05-02T17:00:00.000Z","Close":"2020-05-02T22:00:00.000Z","Day":"Wednesday","Last Modified":"2020-05-02T23:04:20.000Z","Created Time":"2020-05-01T00:35:59.000Z"},"createdTime":"2020-05-01T00:35:59.000Z"},{"id":"recaHZ9ISKphtTJSH","fields":{"Open":"2020-05-02T17:00:00.000Z","Close":"2020-05-02T22:00:00.000Z","Day":"Thursday","Last Modified":"2020-05-02T23:04:22.000Z","Created Time":"2020-05-01T00:35:59.000Z"},"createdTime":"2020-05-01T00:35:59.000Z"},{"id":"rec8qruV96EOMbbPj","fields":{"Open":"2020-05-02T17:00:00.000Z","Close":"2020-05-02T22:00:00.000Z","Day":"Friday","Last Modified":"2020-05-02T23:04:24.000Z","Created Time":"2020-05-01T00:36:06.000Z"},"createdTime":"2020-05-01T00:36:06.000Z"},{"id":"recvkQ5AKCL1WwiyQ","fields":{"Open":"2020-05-02T19:25:00.000Z","Spanish Open":"2020-05-02T19:40:00.000Z","Urdu Close":"2020-05-02T20:30:00.000Z","French Open":"2020-05-02T20:10:00.000Z","Mandarin Open":"2020-05-02T19:50:00.000Z","Urdu Open":"2020-05-02T20:20:00.000Z","Close":"2020-05-02T20:35:00.000Z","English Close":"2020-05-02T19:40:00.000Z","Spanish Close":"2020-05-02T19:50:00.000Z","Russian Close":"2020-05-02T20:10:00.000Z","Russian Open":"2020-05-02T20:00:00.000Z","Mandarin Close":"2020-05-02T20:00:00.000Z","French Close":"2020-05-02T20:20:00.000Z","English Open":"2020-05-02T19:30:00.000Z","Day":"Saturday","Last Modified":"2020-05-02T23:03:58.000Z","Created Time":"2020-05-01T00:36:06.000Z"},"createdTime":"2020-05-01T00:36:06.000Z"},{"id":"recviG67qSnDyxo09","fields":{"Open":"2020-05-02T17:00:00.000Z","Close":"2020-05-02T22:00:00.000Z","Day":"Sunday","Last Modified":"2020-05-02T23:04:28.000Z","Created Time":"2020-05-01T00:36:12.000Z"},"createdTime":"2020-05-01T00:36:12.000Z"}]}`,
);

const sampleOutput = JSON.parse(
  `[{"Day":"Monday","Open":"2020-05-02T17:00:00.000Z","Close":"2020-05-02T22:00:00.000Z"},{"Day":"Tuesday","Open":"2020-05-02T17:00:00.000Z","Close":"2020-05-02T22:00:00.000Z"},{"Day":"Wednesday","Open":"2020-05-02T17:00:00.000Z","Close":"2020-05-02T22:00:00.000Z"},{"Day":"Thursday","Open":"2020-05-02T17:00:00.000Z","Close":"2020-05-02T22:00:00.000Z"},{"Day":"Friday","Open":"2020-05-02T17:00:00.000Z","Close":"2020-05-02T22:00:00.000Z"},{"Day":"Saturday","Open":"2020-05-02T19:25:00.000Z","Close":"2020-05-02T20:35:00.000Z","Urdu Open":"2020-05-02T20:20:00.000Z","Urdu Close":"2020-05-02T20:30:00.000Z","French Open":"2020-05-02T20:10:00.000Z","English Open":"2020-05-02T19:30:00.000Z","French Close":"2020-05-02T20:20:00.000Z","Russian Open":"2020-05-02T20:00:00.000Z","Spanish Open":"2020-05-02T19:40:00.000Z","English Close":"2020-05-02T19:40:00.000Z","Mandarin Open":"2020-05-02T19:50:00.000Z","Russian Close":"2020-05-02T20:10:00.000Z","Spanish Close":"2020-05-02T19:50:00.000Z","Mandarin Close":"2020-05-02T20:00:00.000Z"},{"Day":"Sunday","Open":"2020-05-02T17:00:00.000Z","Close":"2020-05-02T22:00:00.000Z"}]`,
);

describe('api/schedule', () => {
  // beforeEach(() => {
  //   // sandbox = sinon.sandbox.create();
  //   // server = sandbox.useFakeServer();
  // });
  // afterEach(() => {
  //   server.restore();
  //   sandbox.restore();
  // });
  describe('helper functions', () => {
    describe('transformSchedule function', () => {
      it('Should transform the json into the right format', () => {
        const result = transformSchedule(sampleInput);
        expect(result).to.eql(sampleOutput);
      });
    });
    describe('getSchedule', () => {
      let mock;
      let getDevBase;
      beforeEach(() => {
        mock = sinon.mock(axios);
        getDevBase = getScheduleFromBase(process.env.AIRTABLE_DEV_PHONE_BASE);
      });
      afterEach(() => {
        mock.restore();
      });
      describe('It Throttles', () => {
        beforeEach(() => {
          this.clock = sinon.useFakeTimers();
        });
        afterEach(() => {
          this.clock.restore();
        });
        it('Calls axios only once with consecutive calls', async () => {
          const data = sampleInput;
          const resolved = new Promise((r) => r({ data }));
          mock.expects('get').returns(resolved).once();
          this.clock.tick(1); // start the clock at 1, 0 is falsy
          await getDevBase();
          this.clock.tick(1);
          await getDevBase();
          mock.verify();
        });

        it(`Calls axios only twice in a ${
          process.env.AIRTABLE_DELAY + 1
        } miliseconds period`, async () => {
          const data = sampleInput;
          const resolved = new Promise((r) => r({ data }));
          mock.expects('get').returns(resolved).twice();
          this.clock.tick(1);
          await getDevBase();
          this.clock.tick(1);
          await getDevBase(); // this shouldn't fire
          this.clock.tick(parseInt(process.env.AIRTABLE_DELAY));
          await getDevBase();
          mock.verify();
        });
      });
      it('Returns a transformed schedule', async () => {
        const data = sampleInput;
        const resolved = new Promise((r) => r({ data }));
        mock.expects('get').returns(resolved);
        const result = await getDevBase();
        expect(result).to.eql(sampleOutput);
      });
    });
  });
  describe('GET /development', () => {
    let mock;
    beforeEach(() => {
      mock = sinon.mock(axios);
    });
    afterEach(() => {
      mock.restore();
    });
    it('should invoke the dev airtable api and return 200 with schedule', async () => {
      const data = sampleInput;
      const resolved = new Promise((r) => r({ data }));
      const base = process.env.AIRTABLE_DEV_PHONE_BASE;
      const url = `https://api.airtable.com/v0/${base}/General%20Hours`;
      const config = {
        headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
      };
      mock.expects('get').withExactArgs(url, config).returns(resolved);
      const res = await request(app).get('/api/schedule/development');
      mock.verify();
      expect(res.status).to.equal(200);
      expect(res.body).to.eql(sampleOutput);
    });
  });

  describe('GET /production', () => {
    let mock;
    beforeEach(() => {
      mock = sinon.mock(axios);
    });
    afterEach(() => {
      mock.restore();
    });
    it('should invoke the dev airtable api and return 200 with schedule', async () => {
      const data = sampleInput;
      const resolved = new Promise((r) => r({ data }));
      const base = process.env.AIRTABLE_PROD_PHONE_BASE;
      const url = `https://api.airtable.com/v0/${base}/General%20Hours`;
      const config = {
        headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
      };
      mock.expects('get').withExactArgs(url, config).returns(resolved);
      const res = await request(app).get('/api/schedule/production');
      mock.verify();
      expect(res.status).to.equal(200);
      expect(res.body).to.eql(sampleOutput);
    });
  });
});
