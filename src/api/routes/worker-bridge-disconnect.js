const twilio = require('twilio');
const moment = require('moment-timezone');
const app = require('../../server');
const config = require('../../config');
const { logger } = require('../../loaders/logger');

const client = twilio(config.twilio.accountSid, config.twilio.authToken);

app.post('/api/worker-bridge-disconnect', async (req, res) => {
  logger.debug(req.body, 'body:');
  const workerSid = app.get('twilio').workspaceInfo.workers[req.body.Called]
    .sid;
  const workspace = client.taskrouter.workspaces(config.twilio.workspaceSid);

  const worker = workspace.workers(workerSid);

  const reservations = await worker.reservations.list({
    limit: 20,
    reservationStatus: 'accepted',
  });
  if (reservations.length > 0) {
    // lets sort oldest to newest
    reservations.sort((res1, res2) => {
      const res1DateCreated = moment(res1.dateCreated);
      const res2DateCreated = moment(res2.dateCreated);
      return res1DateCreated.isBefore(res2DateCreated) ? 1 : 0;
    });
    const [reservation] = reservations;
    const task = await workspace.tasks(reservation.taskSid).fetch();
    // logger.info(task, 'task: ');

    task
      .update({
        assignmentStatus: 'completed',
        reason: 'Call with agent ended after one or the other party hung up',
      })
      .then(() => logger.info('Task marked completed'));
  } else {
    logger.error('No task found!');
  }
  res.status(200).send(new twilio.twiml.VoiceResponse().toString());
});
