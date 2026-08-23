'use strict';

const { createAuditLogger, AUDIT_ACTIONS } = require('../../src/services/audit-logger.service');

describe('createAuditLogger', () => {
  let writeSpy;

  beforeEach(() => {
    writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => {});
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it('writes a single JSON line ending with a newline to stdout', () => {
    const logger = createAuditLogger();
    logger.log({ action: AUDIT_ACTIONS.USER_REGISTERED, userId: 'u-1', ip: '127.0.0.1', correlationId: 'c-1', meta: {} });

    expect(writeSpy).toHaveBeenCalledTimes(1);
    const output = writeSpy.mock.calls[0][0];
    expect(output.endsWith('\n')).toBe(true);
  });

  it('outputs valid JSON with the required AUDIT envelope fields', () => {
    const logger = createAuditLogger();
    logger.log({
      action: AUDIT_ACTIONS.LOGIN_SUCCESS,
      userId: 'u-2',
      ip: '10.0.0.1',
      correlationId: 'corr-abc',
      meta: { email: 'alice@example.com' },
    });

    const raw = writeSpy.mock.calls[0][0];
    const parsed = JSON.parse(raw);

    expect(parsed.level).toBe('AUDIT');
    expect(parsed.action).toBe(AUDIT_ACTIONS.LOGIN_SUCCESS);
    expect(parsed.userId).toBe('u-2');
    expect(parsed.ip).toBe('10.0.0.1');
    expect(parsed.correlationId).toBe('corr-abc');
    expect(parsed.meta).toEqual({ email: 'alice@example.com' });
    expect(typeof parsed.timestamp).toBe('string');
    // Timestamp must be a valid ISO 8601 date
    expect(() => new Date(parsed.timestamp).toISOString()).not.toThrow();
  });

  it('defaults userId, ip, and correlationId to null when not provided', () => {
    const logger = createAuditLogger();
    logger.log({ action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED });

    const parsed = JSON.parse(writeSpy.mock.calls[0][0]);

    expect(parsed.userId).toBeNull();
    expect(parsed.ip).toBeNull();
    expect(parsed.correlationId).toBeNull();
    expect(parsed.meta).toEqual({});
  });

  it('never throws when meta is omitted', () => {
    const logger = createAuditLogger();
    expect(() => logger.log({ action: AUDIT_ACTIONS.ESCROW_INTENT_CREATED })).not.toThrow();
  });

  it('exports all expected AUDIT_ACTIONS constants', () => {
    const expectedActions = [
      'USER_REGISTERED',
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'GOOGLE_SIGNIN_SUCCESS',
      'PASSWORD_RESET_REQUESTED',
      'PASSWORD_RESET_COMPLETED',
      'WALLET_WITHDRAWAL_INITIATED',
      'WALLET_WITHDRAWAL_FAILED',
      'ESCROW_INTENT_CREATED',
    ];

    expectedActions.forEach((action) => {
      expect(AUDIT_ACTIONS[action]).toBe(action);
    });
  });
});
