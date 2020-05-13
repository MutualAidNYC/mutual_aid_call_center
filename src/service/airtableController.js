const Airtable = require('airtable');
const util = require('util');
// const taskRouter = require('./twilioTaskRouter');
const config = require('../config');
const { logger } = require('../loaders/logger');

const sleep = (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

class AirtableController {
  constructor() {
    this.airtable = new Airtable(config.airtable.apiKey);
    this.stopPoll = false;
  }

  addRowToTable(baseId, tableName, fieldObj) {
    const base = this.airtable.base(baseId);
    const table = base(tableName);
    const create = util.promisify(table.create);
    return create(fieldObj);
  }

  addVmToDb(callId, url, language, phoneNumber) {
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
    return this.addRowToTable(config.airtable.vmBase, 'Voice Mails', fields);
  }

  async pollForDownloadedVmToDelete() {
    const base = this.airtable.base(config.airtable.vmBase);
    const tableSelect = base('Voice Mails').select({
      view: 'Grid view',
      filterByFormula: 'Processed = FALSE()',
    });
    tableSelect.firstPage(this._processPageOfDownloadedVMs());
    if (!this.stopPoll) {
      await sleep(60000);
      this.pollForDownloadedVmToDelete();
    }
  }

  async updateRecord(baseId, table, recordId, fields) {
    const base = this.airtable.base(baseId);
    const update = util.promisify(base(table).update);
    let result;
    try {
      result = await update(recordId, fields);
    } catch (err) {
      logger.error('Error updating record %o', err);
    }
    return result;
  }

  set taskRouter(tr) {
    this.tr = tr;
  }

  get taskRouter() {
    return this.tr;
  }

  _processPageOfDownloadedVMs() {
    // we need to bind the context of 'this' return a bound function
    const pageProcessor = (err, records) => {
      if (err) {
        logger.error(err);
        return;
      }
      records.forEach((record) => {
        const [vm] = record.get('Voice Mail');
        if (vm.url.includes('twilio')) return;
        this.tr.deleteRecording(record.get('Call ID'));
        this.updateRecord(config.airtable.vmBase, 'Voice Mails', record.id, {
          Processed: true,
        });
      });
    };
    return pageProcessor.bind(this);
  }
}

const airtableController = new AirtableController();

module.exports = airtableController;
