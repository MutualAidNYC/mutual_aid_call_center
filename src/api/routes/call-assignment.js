const app = require('../../server');
const taskRouter = require('../../service/twilioTaskRouter');

app.post('/api/call-assignment', async (req, res) => {
  await taskRouter.handleCallAssignment(req.body);
  res.status(200).send();
});
