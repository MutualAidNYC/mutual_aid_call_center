const app = require('../../server');
const taskRouter = require('../../service/twilioTaskRouter');

app.post('/api/agent-gather', async (req, res) => {
  const result = await taskRouter.handleAgentGather(req.body);
  res.status(200).send(result);
});
