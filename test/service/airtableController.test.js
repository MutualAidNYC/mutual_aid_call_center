const { expect } = require('chai');
const sinon = require('sinon');
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
});
