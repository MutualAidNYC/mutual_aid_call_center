const { expect } = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const config = require('../../src/config');
const airtableController = require('../../src/service/airtableController');
const taskRouter = require('../../src/service/twilioTaskRouter');

describe('airtableController', () => {
  const baseId = 'appxxxxxxxxxx';
  const recordId = 'recXXXXXXXXXXXX';
  describe('addRowToTable', () => {
    let selectedBaseStub;
    let baseStub;
    let createStub;
    const tableName = 'some table';
    const fieldObj = {};
    beforeEach(() => {
      createStub = sinon.stub();
      // createStub.resolves(recordId);
      createStub.callsArgWith(1, undefined, recordId);
      baseStub = sinon.stub(airtableController.airtable, 'base');
      selectedBaseStub = sinon.stub();

      baseStub.returns(selectedBaseStub);
      selectedBaseStub.returns({ create: createStub });
    });
    afterEach(() => {
      baseStub.restore();
    });
    it('Adds row to specified table', async () => {
      expect(
        await airtableController.addRowToTable(baseId, tableName, fieldObj),
      ).to.equal(recordId);
      expect(baseStub.firstCall.firstArg).to.equal(baseId);
      expect(selectedBaseStub.firstCall.firstArg).to.equal(tableName);
      expect(createStub.firstCall.firstArg).to.equal(fieldObj);
    });
  });
  describe('addVmToDb', () => {
    let addRowToTableStub;
    const callId = 'CAxxxxxxxxxxxxxxxx';
    const url = 'https://www.google.com';
    const language = 'English';
    const phoneNumber = '+12223334444';
    const fields = {
      'Call ID': callId,
      'Voice Mail': [
        {
          url,
        },
      ],
      Language: language,
      'Phone Number': phoneNumber,
    };
    beforeEach(() => {
      addRowToTableStub = sinon.stub(airtableController, 'addRowToTable');
      addRowToTableStub.resolves(recordId);
    });
    afterEach(() => {
      addRowToTableStub.restore();
    });
    it('Creates a VM Record', async () => {
      expect(
        await airtableController.addVmToDb(callId, url, language, phoneNumber),
      ).to.equal(recordId);
      expect(addRowToTableStub.firstCall.args[0]).to.equal(
        config.airtable.vmBase,
      );
      expect(addRowToTableStub.firstCall.args[1]).to.equal('Voice Mails');
      expect(addRowToTableStub.firstCall.args[2]).to.eql(fields);
    });
  });
  describe('updateRecord', () => {
    const tableName = 'some table';
    const fieldObj = {};
    let updateStub;
    let baseStub;
    let selectedBaseStub;
    const record = {};
    beforeEach(() => {
      baseStub = sinon.stub(airtableController.airtable, 'base');
      updateStub = sinon.stub();
      updateStub.callsArgWith(2, undefined, record);
      selectedBaseStub = sinon.stub();

      baseStub.returns(selectedBaseStub);
      selectedBaseStub.returns({ update: updateStub });
    });
    afterEach(() => {
      baseStub.restore();
    });
    it('Updates the specified record', async () => {
      expect(
        await airtableController.updateRecord(
          baseId,
          tableName,
          recordId,
          fieldObj,
        ),
      ).to.equal(record);
      expect(baseStub.firstCall.firstArg).to.equal(baseId);
      expect(selectedBaseStub.firstCall.firstArg).to.equal(tableName);
      expect(updateStub.firstCall.args[0]).to.equal(recordId);
      expect(updateStub.firstCall.args[1]).to.equal(fieldObj);
    });
  });
  describe('pollForDownloadedVmToDelete', () => {
    const tableName = 'Voice Mails';
    let processPageOfDownloadedVMsStub;
    let firstPageStub;
    let baseStub;
    let selectedBaseStub;
    let tableStub;
    let clock;
    beforeEach(() => {
      baseStub = sinon.stub(airtableController.airtable, 'base');
      firstPageStub = sinon.stub();
      selectedBaseStub = sinon.stub();
      processPageOfDownloadedVMsStub = sinon.stub(
        airtableController,
        '_processPageOfDownloadedVMs',
      );
      tableStub = sinon.stub();

      processPageOfDownloadedVMsStub.returns(() => {});
      baseStub.returns(tableStub);
      tableStub.returns({ select: selectedBaseStub });
      selectedBaseStub.returns({ firstPage: firstPageStub });
    });
    afterEach(() => {
      processPageOfDownloadedVMsStub.restore();
      airtableController.stopPoll = false;
      baseStub.restore();
      clock.restore();
    });
    it('Polls only once a minute', async () => {
      clock = sinon.useFakeTimers();

      airtableController.pollForDownloadedVmToDelete();

      clock.tick(70000); // simulate 70 seconds passing
      await clock.tickAsync(1000); // let the system have a chance to process

      expect(processPageOfDownloadedVMsStub.calledTwice).to.equal(true);
    });
    it('Invokes firstPage', async () => {
      airtableController.stopPoll = true;
      airtableController.pollForDownloadedVmToDelete();
      expect(baseStub.firstCall.firstArg).to.equal(config.airtable.vmBase);
      expect(tableStub.firstCall.firstArg).to.equal(tableName);
      expect(selectedBaseStub.firstCall.firstArg).to.eql({
        view: 'Grid view',
        filterByFormula: 'Processed = FALSE()',
      });
      expect(typeof firstPageStub.firstCall.firstArg).to.equal('function');
      expect(processPageOfDownloadedVMsStub.called).to.equal(true);
    });
  });
  describe('get taskRouter', () => {
    const router = airtableController.tr;
    beforeEach(() => {
      airtableController.tr = taskRouter;
    });
    afterEach(() => {
      airtableController.tr = router;
    });
    it('returns the value of tr', () => {
      expect(airtableController.taskRouter).to.equal(taskRouter);
    });
  });

  describe('set taskRouter', () => {
    const router = airtableController.tr;
    beforeEach(() => {
      airtableController.tr = taskRouter;
    });
    afterEach(() => {
      airtableController.tr = router;
    });
    it('returns sets value of tr', () => {
      const fake = {};
      airtableController.taskRouter = fake;
      expect(airtableController.tr).to.equal(fake);
    });
  });

  describe('_processPageOfDownloadedVMs', () => {
    let deleteRecordingStub;
    let updateRecordStub;
    let getStub;
    beforeEach(() => {
      deleteRecordingStub = sinon.stub(taskRouter, 'deleteRecording');
      updateRecordStub = sinon.stub(airtableController, 'updateRecord');
      getStub = sinon.stub();
      airtableController.taskRouter = taskRouter;
    });
    afterEach(() => {
      deleteRecordingStub.restore();
      updateRecordStub.restore();
    });
    it('returns a function', () => {
      expect(typeof airtableController._processPageOfDownloadedVMs()).to.equal(
        'function',
      );
    });
    it('deletes recording mark it processed when ready', () => {
      const records = [{ id: 'klljksajlkas', get: getStub }];
      const vms = [{ url: 'https://dl.airtable.com/.attachments/8' }];
      const callId = 'kljsadlkjljkjlkaslk';
      getStub.withArgs('Voice Mail').returns(vms);
      getStub.withArgs('Call ID').returns(callId);
      const pageProcessor = airtableController._processPageOfDownloadedVMs();
      expect(pageProcessor(undefined, records)).to.equal(undefined);
      expect(deleteRecordingStub.firstCall.firstArg).to.equal(callId);
      expect(updateRecordStub.firstCall.args[0]).to.equal(
        config.airtable.vmBase,
      );
      expect(updateRecordStub.firstCall.args[1]).to.equal('Voice Mails');
      expect(updateRecordStub.firstCall.args[2]).to.equal(records[0].id);
      expect(updateRecordStub.firstCall.args[3]).to.eql({
        Processed: true,
      });
    });

    it('skips when not yet downloaded', () => {
      const records = [{ id: 'klljksajlkas', get: getStub }];
      const vms = [{ url: '	https://api.twilio.com/2010-04-01/Accounts/AC' }];
      const callId = 'kljsadlkjljkjlkaslk';
      getStub.withArgs('Voice Mail').returns(vms);
      getStub.withArgs('Call ID').returns(callId);
      const pageProcessor = airtableController._processPageOfDownloadedVMs();
      expect(pageProcessor(undefined, records)).to.equal(undefined);
      expect(deleteRecordingStub.notCalled).to.equal(true);
      expect(updateRecordStub.notCalled).to.equal(true);
    });
  });

  describe('fetchAllRecordsFromTable', () => {
    const table = 'General Hours';
    const page1 = {
      records: [
        {
          id: 'recXXXXXXXXXXXXX',
          fields: {
            Day: 'Monday',
          },
          createdTime: '2020-05-01T00:35:45.000Z',
        },
        {
          id: 'reXXXXXXXXXXXXXXX2',
          fields: {
            Day: 'Tuesday',
          },
          createdTime: '2020-05-01T00:35:53.000Z',
        },
      ],
      offset: 'reXXXXXXXXXXXXXXX2',
    };
    const page2 = {
      records: [
        {
          id: 'recXXXXXXXXXXXXXXX3',
          fields: {
            Day: 'Wednesday',
          },
          createdTime: '2020-05-01T00:35:59.000Z',
        },
      ],
    };
    const fullList = [
      {
        id: 'recXXXXXXXXXXXXX',
        fields: {
          Day: 'Monday',
        },
        createdTime: '2020-05-01T00:35:45.000Z',
      },
      {
        id: 'reXXXXXXXXXXXXXXX2',
        fields: {
          Day: 'Tuesday',
        },
        createdTime: '2020-05-01T00:35:53.000Z',
      },
      {
        id: 'recXXXXXXXXXXXXXXX3',
        fields: {
          Day: 'Wednesday',
        },
        createdTime: '2020-05-01T00:35:59.000Z',
      },
    ];
    let axiosStub;
    let clock;
    const axiosConfig1 = {
      method: 'get',
      url: `https://api.airtable.com/v0/${config.airtable.phoneBase}/General%20Hours?view=Grid%20view`,
      headers: {
        Authorization: `Bearer ${config.airtable.apiKey}`,
      },
      data: {
        view: 'Grid%20view',
      },
    };
    const axiosConfig2 = {
      method: 'get',
      url: `https://api.airtable.com/v0/${config.airtable.phoneBase}/General%20Hours?view=Grid%20view`,
      headers: {
        Authorization: `Bearer ${config.airtable.apiKey}`,
      },
      data: {
        view: 'Grid%20view',
        offset: 'reXXXXXXXXXXXXXXX2',
      },
    };
    beforeEach(() => {
      axiosStub = sinon.stub(axios, 'request');
    });
    afterEach(() => {
      axiosStub.restore();
      if (clock) clock.restore();
    });
    it('Fetches all records from table', async () => {
      axiosStub.onFirstCall().resolves({ data: page1 });
      axiosStub.onSecondCall().resolves({ data: page2 });

      expect(
        await airtableController.fetchAllRecordsFromTable(
          table,
          config.airtable.phoneBase,
        ),
      ).to.eql(fullList);
      expect(axiosStub.firstCall.firstArg).to.eql(axiosConfig1);
      expect(axiosStub.secondCall.firstArg).to.eql(axiosConfig2);
      expect(axiosStub.calledTwice).to.equal(true);
    });
    it('Is rate limited', async () => {
      axiosStub.onFirstCall().resolves({ data: page1 });
      axiosStub.onSecondCall().resolves({ data: page2 });

      clock = sinon.useFakeTimers();
      airtableController.fetchAllRecordsFromTable(
        table,
        config.airtable.phoneBase,
      );
      clock.tick(200);
      await clock.tickAsync(49);
      expect(axiosStub.calledOnce).to.equal(true);
    });
    it('Waits 30 or more on an error', async () => {
      clock = sinon.useFakeTimers();
      axiosStub.throws();
      airtableController.fetchAllRecordsFromTable(
        table,
        config.airtable.phoneBase,
      );
      clock.tick(29500);
      await clock.tickAsync(499);
      expect(axiosStub.calledOnce).to.equal(true);
      await clock.tickAsync(100);
      expect(axiosStub.calledTwice).to.equal(true);
    });
  });

  describe('findByFieldAndUpdate', () => {
    const tableName = 'Voice Mails';
    let firstPageStub;
    let baseStub;
    let selectedBaseStub;
    let updateStub;
    let tableStub;
    beforeEach(() => {
      baseStub = sinon.stub(airtableController.airtable, 'base');
      firstPageStub = sinon.stub();
      selectedBaseStub = sinon.stub();
      tableStub = sinon.stub();
      updateStub = sinon.stub(airtableController, 'updateRecord');
      baseStub.returns(tableStub);
      tableStub.returns({ select: selectedBaseStub });
      selectedBaseStub.returns({ firstPage: firstPageStub });
    });
    afterEach(() => {
      baseStub.restore();
      updateStub.restore();
    });
    it('Finds a record, then updates it', async () => {
      const fields = {};
      firstPageStub.callsArgWith(0, undefined, [{ id: 'recXXXXXXXX' }]);
      await airtableController.findByFieldAndUpdate(
        config.airtable.vmBase,
        'Voice Mails',
        fields,
        'Call ID',
        'REXXXXXXXX',
      );
      expect(baseStub.firstCall.firstArg).to.equal(config.airtable.vmBase);
      expect(tableStub.firstCall.firstArg).to.equal(tableName);
      expect(selectedBaseStub.firstCall.firstArg).to.eql({
        filterByFormula: '{Call ID} = "REXXXXXXXX"',
      });
      expect(updateStub.firstCall.args[0]).to.equal(config.airtable.vmBase);
      expect(updateStub.firstCall.args[1]).to.equal(tableName);
      expect(updateStub.firstCall.args[2]).to.equal('recXXXXXXXX');
      expect(updateStub.firstCall.args[3]).to.equal(fields);
    });
  });
  describe('saveTranscript', () => {
    let stub;
    const transcript = 'Some boring vm';
    const recordingId = 'RExxxxxxxxxxx';
    beforeEach(() => {
      stub = sinon.stub(airtableController, 'findByFieldAndUpdate');
    });
    afterEach(() => {
      stub.restore();
    });
    it('Uses findByFieldAndUpdate', () => {
      airtableController.saveTranscript(recordingId, transcript);
      expect(stub.firstCall.args[0]).to.equal(config.airtable.vmBase);
      expect(stub.firstCall.args[1]).to.equal('Voice Mails');
      expect(stub.firstCall.args[2]).to.eql({ Transcript: transcript });
      expect(stub.firstCall.args[3]).to.equal('Call ID');
      expect(stub.firstCall.args[4]).to.equal(recordingId);
    });
  });
});
