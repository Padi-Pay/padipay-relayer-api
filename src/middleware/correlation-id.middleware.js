const crypto = require('node:crypto');

const CORRELATION_ID_HEADER = 'X-Correlation-ID';

// Client-supplied correlation IDs are echoed back into response headers and
// server logs, so only a bounded, safe-charset value is trusted. Anything
// else (missing, malformed, or oversized) is replaced with a freshly
// generated one rather than rejecting the request.
const SAFE_CORRELATION_ID_PATTERN = /^[a-zA-Z0-9-]{1,64}$/;

const correlationId = (req, res, next) => {
  const incoming = req.header(CORRELATION_ID_HEADER);
  const id = incoming && SAFE_CORRELATION_ID_PATTERN.test(incoming) ? incoming : crypto.randomUUID();

  req.id = id;
  res.set(CORRELATION_ID_HEADER, id);

  next();
};

module.exports = { correlationId, CORRELATION_ID_HEADER };
