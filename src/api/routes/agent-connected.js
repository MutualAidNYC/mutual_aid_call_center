const app = require('../../server');
// const { logger } = require('../../loaders/logger');
const taskRouter = require('../../service/twilioTaskRouter');

app.post('/api/agent-connected', async (req, res) => {
  const reply = await taskRouter.handleAgentConnected(req.body);
  res.status(200).type('text/xml').send(reply);
});
