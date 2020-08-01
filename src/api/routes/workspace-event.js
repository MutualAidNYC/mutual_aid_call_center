const moment = require('moment-timezone');
const app = require('../../server');
const { logger } = require('../../loaders/logger');
const airtable = require('../../service/airtableController');
const config = require('../../config');
const airtableController = require('../../service/airtableController');

const TABLE_NAME = 'Hotline Auto Log';
const END_STATUS_FIELD = 'Call End Status';

const processEvent = async (event) => {
  const { phoneBase } = config.airtable;
  let fields;
  switch (event.EventType) {
    case 'task.created':
      // eslint-disable-next-line camelcase, no-case-declarations
      const { selected_language: Language, call_sid, from } = JSON.parse(
        event.TaskAttributes,
      );
      airtable.addRowToTable(phoneBase, TABLE_NAME, {
        Language,
        call_sid,
        task_sid: event.TaskSid,
        'Caller Phone Number': from.slice(2),
      });
      break;
    case 'task.canceled':
      fields = { seconds_in_queue: parseInt(event.TaskAge) };
      fields[END_STATUS_FIELD] = 'Hangup before volunteer connected';
      airtableController.findByFieldAndUpdate(
        phoneBase,
        TABLE_NAME,
        fields,
        'task_sid',
        event.TaskSid,
      );
      break;
    case 'reservation.accepted':
      fields = {
        seconds_in_queue: parseInt(event.TaskAge),
      };
      if (event.WorkerSid === config.twilio.vmWorkerSid) {
        fields['Call End Status'] = 'Timed out of queue';
      } else {
        fields['Volunteer Name'] = event.WorkerName;
        fields['Volunteer Connect Time'] = moment()
          .tz('America/New_york')
          .toISOString();
      }

      airtableController.findByFieldAndUpdate(
        phoneBase,
        TABLE_NAME,
        fields,
        'task_sid',
        event.TaskSid,
      );
      break;
    case 'task.completed':
      if (event.WorkerSid === config.twilio.vmWorkerSid) return;
      fields = {
        talk_end_age: parseInt(event.TaskAge),
        'Call End Status': 'Talked with volunteer',
      };
      airtableController.findByFieldAndUpdate(
        phoneBase,
        TABLE_NAME,
        fields,
        'task_sid',
        event.TaskSid,
      );
      break;
    default:
      logger.info('workspace event: %o', event);
      break;
  }
};

app.post('/api/workspace-event', async (req, res) => {
  processEvent(req.body);
  res.sendStatus(200);
});
