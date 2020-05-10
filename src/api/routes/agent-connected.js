const twilio = require('twilio');
const app = require('../../server');
const config = require('../../config');
const { logger } = require('../../loaders/logger');

const client = twilio(config.twilio.accountSid, config.twilio.authToken);

app.post('/api/agent-connected', async (req, res) => {
  const response = new twilio.twiml.VoiceResponse();
  // lets call the assigned worker
  const workerSid = app.get('twilio').workspaceInfo.workers[req.body.Called]
    .sid;
  const workspace = client.taskrouter.workspaces(config.twilio.workspaceSid);
  const worker = workspace.workers(workerSid);
  const pendingReservations = await worker.reservations.list({
    limit: 20,
    reservationStatus: 'pending',
  });

  let pendingReservation;
  if (pendingReservations.length === 1) {
    [pendingReservation] = pendingReservations;
    // logger.info(pendingReservation, 'Reservation:');
  } else {
    logger.error('0 or more than 1 pending reservation found');
    response.hangup();
    res.status(200).send(response.toString());
    return;
  }
  // logger.info(req.body, 'body:');
  if (req.body.AnsweredBy === 'human') {
    logger.info('Human detected');
    worker
      .reservations(pendingReservation.sid)
      .update({ reservationStatus: 'accepted' });
    const { taskSid } = pendingReservation;
    const task = await workspace.tasks(taskSid).fetch();
    const callerCallSid = JSON.parse(task.attributes).call_sid;
    const agentCallSid = req.body.CallSid;

    response.dial().conference({ endConferenceOnExit: true }, callerCallSid);
    // const callerResponse = new twilio.twiml.VoiceResponse();
    // logger.info(callerCallSid, 'callerCallSid:');
    client.calls(callerCallSid).update({ twiml: response.toString() });
    client.calls(agentCallSid).update({
      twiml: response.toString(),
      statusCallback: `https://${config.hostName}/api/worker-bridge-disconnect`,
      statusCallbackMethod: 'POST',
    });
    res
      .status(200)
      .type('text/xml')
      .send('<Response><Pause length="5"/></Response>');
    return;
  }
  logger.info('Machine detected');
  worker
    .reservations(pendingReservation.sid)
    .update({ reservationStatus: 'rejected' });
  response.hangup();

  res.status(200).send(response.toString());
});
