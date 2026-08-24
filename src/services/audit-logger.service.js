'use strict';

/**
 * Audit action constants for high-value security and financial operations.
 * Use these to avoid typo-prone inline strings at call sites.
 */
const AUDIT_ACTIONS = {
  USER_REGISTERED: 'USER_REGISTERED',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  GOOGLE_SIGNIN_SUCCESS: 'GOOGLE_SIGNIN_SUCCESS',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
  WALLET_WITHDRAWAL_INITIATED: 'WALLET_WITHDRAWAL_INITIATED',
  WALLET_WITHDRAWAL_FAILED: 'WALLET_WITHDRAWAL_FAILED',
  ESCROW_INTENT_CREATED: 'ESCROW_INTENT_CREATED',
};

/**
 * Factory that creates a lightweight structured audit logger.
 *
 * Each call to `log()` writes a single JSON line to stdout so that
 * external log aggregators (e.g. Loki, CloudWatch, Datadog) can ingest
 * and index it without any coupling to a database.
 *
 * Output shape:
 * {
 *   "level":         "AUDIT",
 *   "action":        "USER_REGISTERED",
 *   "userId":        "uuid | null",
 *   "ip":            "127.0.0.1 | null",
 *   "correlationId": "uuid | null",
 *   "meta":          {},
 *   "timestamp":     "2026-08-23T17:00:00.000Z"
 * }
 *
 * IMPORTANT: Passwords, secret keys, and raw tokens must NEVER appear in `meta`.
 */
const createAuditLogger = () => {
  /**
   * Write one structured audit entry to stdout.
   *
   * @param {Object}      event
   * @param {string}      event.action        - One of AUDIT_ACTIONS
   * @param {string|null} [event.userId]      - The acting user's database ID
   * @param {string|null} [event.ip]          - Originating IP address (req.ip)
   * @param {string|null} [event.correlationId] - Request correlation ID (req.id)
   * @param {Object}      [event.meta]        - Additional context (NO secrets)
   */
  const log = ({ action, userId = null, ip = null, correlationId = null, meta = {} }) => {
    const entry = {
      level: 'AUDIT',
      action,
      userId,
      ip,
      correlationId,
      meta,
      timestamp: new Date().toISOString(),
    };

    process.stdout.write(JSON.stringify(entry) + '\n');
  };

  return { log };
};

module.exports = { createAuditLogger, AUDIT_ACTIONS };
