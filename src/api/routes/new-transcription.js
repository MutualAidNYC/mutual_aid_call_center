const app = require('../../server');
const taskRouter = require('../../service/twilioTaskRouter');

app.post('/api/new-transcription', (req, res) => {
  taskRouter.handleNewTranscription(req.body);
  res.status(200).send();
});
