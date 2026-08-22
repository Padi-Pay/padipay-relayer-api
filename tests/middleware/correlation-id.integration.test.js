const express = require('express');
const request = require('supertest');
const { correlationId, CORRELATION_ID_HEADER } = require('../../src/middleware/correlation-id.middleware');
const errorHandler = require('../../src/middleware/error.middleware');
const AppError = require('../../src/errors/AppError');

// End-to-end proof that a request's correlation ID is consistent across the
// response header, the JSON error body, and the server log line for that
// same request — wired exactly as it is in src/app.js, but without the full
// application bootstrap (Stellar/Prisma clients), matching this repo's
// pattern of testing routes/middleware against a minimal isolated app.
describe('Correlation ID end-to-end wiring', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(correlationId);

    app.get('/ok', (req, res) => {
      res.json({ id: req.id });
    });

    app.get('/boom', () => {
      throw new AppError('Something broke', 400, 'BROKEN');
    });

    app.get('/crash', () => {
      throw new Error('kaboom');
    });

    app.use(errorHandler);
  });

  it('sets the same correlation ID on the response header for a successful request', async () => {
    const res = await request(app).get('/ok');

    expect(res.status).toBe(200);
    expect(res.headers[CORRELATION_ID_HEADER.toLowerCase()]).toBeDefined();
    expect(res.body.id).toBe(res.headers[CORRELATION_ID_HEADER.toLowerCase()]);
  });

  it('honors a client-supplied correlation ID end-to-end', async () => {
    const res = await request(app).get('/ok').set(CORRELATION_ID_HEADER, 'my-support-ticket-id');

    expect(res.headers[CORRELATION_ID_HEADER.toLowerCase()]).toBe('my-support-ticket-id');
    expect(res.body.id).toBe('my-support-ticket-id');
  });

  it('returns the same correlation ID in the header and the error body when a request fails', async () => {
    const res = await request(app).get('/boom');

    expect(res.status).toBe(400);
    const headerId = res.headers[CORRELATION_ID_HEADER.toLowerCase()];
    expect(headerId).toBeDefined();
    expect(res.body.correlationId).toBe(headerId);
  });

  it('logs the same correlation ID that is returned to the client for an unexpected error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).get('/crash');
    const headerId = res.headers[CORRELATION_ID_HEADER.toLowerCase()];

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(headerId), expect.any(Error));

    consoleSpy.mockRestore();
  });
});
