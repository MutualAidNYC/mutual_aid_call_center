const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const {
  transformSchedule,
  getScheduleFromBase,
  setDevSchedule,
  setProdSchedule,
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
      it('Returns a transformed schedule', async () => {
        const data = sampleInput;
        const resolved = new Promise((r) => r({ data }));
        mock.expects('get').returns(resolved);
        const result = await getDevBase();
        expect(result).to.eql(sampleOutput);
      });
    });
    describe('setSchedule(s)', () => {
      let mock;
      const schedule = 'some schedule';
      beforeEach(() => {
        mock = sinon.mock(app);
      });
      afterEach(() => {
        mock.restore();
      });
      describe('setDevSchedule', () => {
        it('Invokes app.set("devSchedule")', async () => {
          const getDevSchedule = sinon.fake.returns(schedule);
          mock.expects('set').withExactArgs('devSchedule', schedule);
          await setDevSchedule(getDevSchedule);
          mock.verify();
        });
      });
      describe('setProdSchedule', () => {
        it('Invokes app.set("devSchedule")', async () => {
          const getProdSchedule = sinon.fake.returns(schedule);
          mock.expects('set').withExactArgs('prodSchedule', schedule);
          await setProdSchedule(getProdSchedule);
          mock.verify();
        });
      });
    });
  });
  describe('GET /development', () => {
    it('should get a devSchedule from app.get', async () => {
      app.set('devSchedule', sampleOutput);
      const res = await request(app).get('/api/schedule/development');
      app.set('devSchedule', undefined); // reset the value
      expect(res.status).to.equal(200);
      expect(res.body).to.eql(sampleOutput);
    });
  });

  describe('GET /production', () => {
    it('should get a prodSchedule from app.get', async () => {
      app.set('prodSchedule', sampleOutput);
      const res = await request(app).get('/api/schedule/production');
      expect(res.status).to.equal(200);
      expect(res.body).to.eql(sampleOutput);
    });
  });
});
