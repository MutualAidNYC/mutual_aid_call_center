const pino = require('pino');
const expressPino = require('express-pino-logger');
const config = require('../config');

const useLevel = config.isProduction ? 'info' : 'debug';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const expressLogger = expressPino({ logger, useLevel });

module.exports = {
  logger,
  expressLogger,
};
