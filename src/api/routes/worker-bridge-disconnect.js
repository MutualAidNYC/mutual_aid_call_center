const app = require('../../server');
const taskRouter = require('../../service/twilioTaskRouter');

app.post('/api/worker-bridge-disconnect', (req, res) => {
  taskRouter.handleWorkerBridgeDisconnect(req.body);
  res.sendStatus(200);
});
