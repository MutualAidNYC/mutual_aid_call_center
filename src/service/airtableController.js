const Airtable = require('airtable');
const util = require('util');
const axios = require('axios');
const config = require('../config');
const { logger } = require('../loaders/logger');

const sleep = (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

class AirtableController {
  constructor() {
    this.airtable = new Airtable(config.airtable.apiKey);
    this.stopPoll = false;
    this.axios = axios;
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

  async fetchAllRecordsFromTable(table, base) {
    const urlifiedTableName = table.replace(' ', '%20');
    let count = 0;
    const maxTries = 2000;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const allRecords = [];
      let offset;
      try {
        let fetchNextPage = true;
        while (fetchNextPage) {
          const axiosConfig = {
            headers: {
              Authorization: `Bearer ${config.airtable.apiKey}`,
            },
            method: 'get',
            url: `https://api.airtable.com/v0/${base}/${urlifiedTableName}?view=Grid%20view`,
            data: {
              view: 'Grid%20view',
            },
          };
          if (offset) {
            axiosConfig.data.offset = offset;
          }
          const response = await this.axios.request(axiosConfig); // eslint-disable-line no-await-in-loop
          response.data.records.forEach((record) => {
            allRecords.push(record);
          });
          if (response.data.offset) {
            offset = response.data.offset;
          } else {
            fetchNextPage = false;
          }
          await sleep(250); // eslint-disable-line no-await-in-loop
        }
        return allRecords;
      } catch (error) {
        logger.error('Error fetching from airtable: %o', error);
        await sleep(30000); // eslint-disable-line no-await-in-loop
        count += 1;
        if (count === maxTries) throw new Error('Maximum calls');
      }
    }
  }
}

const airtableController = new AirtableController();

module.exports = airtableController;
