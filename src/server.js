const express = require('express');
const bodyParser = require('body-parser');
const { expressLogger } = require('./loaders/logger');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(expressLogger);

module.exports = app;
