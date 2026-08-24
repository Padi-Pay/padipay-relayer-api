const errorHandler = require('../../src/middleware/error.middleware');
const AppError = require('../../src/errors/AppError');
const logger = require('../../src/config/logger');

jest.mock('../../src/config/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

describe('Error Middleware', () => {
  let req, res, next;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    process.env.NODE_ENV = 'production';
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should format AppError correctly in production (no stack trace)', () => {
    const err = new AppError('Custom Error', 400, 'CUSTOM_ERR');

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Custom Error',
      error: 'CUSTOM_ERR',
    });
  });

  it('should include stack trace when not in production', () => {
    process.env.NODE_ENV = 'development';
    const err = new AppError('Custom Error', 400, 'CUSTOM_ERR');

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Custom Error',
        error: 'CUSTOM_ERR',
        stack: expect.any(String),
      })
    );
  });

  it('should default to 500 INTERNAL_ERROR for unhandled generic errors', () => {
    const err = new Error('Unexpected');

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal Server Error',
      error: 'INTERNAL_ERROR',
    });

    expect(logger.error).toHaveBeenCalled();
  });

  it('should include the request correlation ID in the response for an AppError', () => {
    req.id = 'test-correlation-id-1';
    const err = new AppError('Custom Error', 400, 'CUSTOM_ERR');

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ correlationId: 'test-correlation-id-1' })
    );
  });

  it('should include the request correlation ID in the response and the log for an unexpected error', () => {
    req.id = 'test-correlation-id-2';
    const err = new Error('Unexpected');

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ correlationId: 'test-correlation-id-2' })
    );
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err, correlationId: 'test-correlation-id-2' }),
      'Unexpected error'
    );
  });
});

