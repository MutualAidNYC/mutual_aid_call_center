const path = require('path');
const express = require('express');
const app = require('../../server');

app.use('/assets', express.static(path.join(__dirname, '..', '..', 'assets')));
