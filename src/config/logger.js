'use strict';

const pino = require('pino');

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Application-wide structured logger powered by pino.
 *
 * Behaviour by environment:
 *   - production  → raw JSON lines to stdout (machine-readable, no colour)
 *   - development / test → pino-pretty human-readable output to stdout
 *
 * Error serialization:
 *   Pass errors as `{ err: errorInstance }` so pino's built-in `err`
 *   serializer captures message, stack, type, and code in the JSON output.
 *
 * Usage:
 *   const logger = require('./config/logger');
 *   logger.info('Server started');
 *   logger.error({ err }, 'Unhandled exception');
 */
const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    serializers: {
      err: pino.stdSerializers.err,
    },
    // Suppress all logs during test runs to keep test output clean.
    // Individual tests can inject their own logger mock if needed.
    ...(process.env.NODE_ENV === 'test' && { level: 'silent' }),
  },
  isDevelopment
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      })
    : undefined
);

module.exports = logger;
