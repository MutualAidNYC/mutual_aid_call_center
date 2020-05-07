const dotenv = require('dotenv');
const app = require('../../server');

if (process.env.NODE_ENV !== 'production') {
  dotenv.config(); // load the local .env file
}

const HEADER = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>`;

const FOOTER = '</Response>';
app.post('/api/language/:language', async (req, res) => {
  const language = req.params.language.toLowerCase();
  const docParts = [HEADER];
  const languageObj = app.get('languages');
  if (languageObj[language]) {
    docParts.push(`<Dial callerId="${req.query.To}">`);
    languageObj[language].slice(0, 10).forEach((number) => {
      // we can only call at most 10 people
      docParts.push(`<Number>${number}</Number>`);
    });
    docParts.push('</Dial>');
  } else {
    const message =
      'We’re sorry, we currently have no volunteers available at this time. Please trying call back in a few minutes, or visit us on the web www, dot mutual, aid dot en why see, for additional resources.';
    docParts.push(`<Say>${message}</Say>`);
  }

  docParts.push(FOOTER);
  const doc = docParts.join('\n');
  res.type('text/xml');
  res.status(200).send(doc);
});
