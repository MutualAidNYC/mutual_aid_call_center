const app = require('../../server');
const taskRouter = require('../../service/twilioTaskRouter');

app.post('/api/vm-recording-ended', async (req, res) => {
  const result = await taskRouter.handleVmRecordingEnded(req.body);
  res.status(200).send(result);
});
