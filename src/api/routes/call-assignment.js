const app = require('../../server');
const { logger } = require('../../loaders/logger');
const config = require('../../config');

app.post('/api/call-assignment', async (req, res) => {
  req.body.WorkerAttributes = JSON.parse(req.body.WorkerAttributes);
  req.body.TaskAttributes = JSON.parse(req.body.TaskAttributes);

  // lets call the assigned worker
  const twilioObject = app.get('twilio');
  const { client } = twilioObject;
  const callerId = req.body.TaskAttributes.called;
  // logger.info(req.body, 'Assignment received');
  try {
    await client.calls.create({
      // twiml: '<Response><Say>Ahoy there!</Say></Response>',
      to: req.body.WorkerAttributes.contact_uri,
      from: callerId,
      machineDetection: 'Enable',
      url: `https://${config.hostName}/api/agent-connected`,
      // asyncAmdStatusCallback: `https://${config.hostName}/api/agent-connected`,
      // asyncAmd: 'true',
    });
  } catch (error) {
    logger.error(error);
  }
  res.status(200).send();
});
