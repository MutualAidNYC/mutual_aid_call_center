const app = require('../../server');
const taskRouter = require('../../service/twilioTaskRouter');

app.post('/api/worker-bridge-disconnect', async (req, res) => {
  const result = taskRouter.handleWorkerBridgeDisconnect(req.body);
  res.status(200).send(result);
});
