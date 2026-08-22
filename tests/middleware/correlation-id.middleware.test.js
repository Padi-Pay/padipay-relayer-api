const { correlationId, CORRELATION_ID_HEADER } = require('../../src/middleware/correlation-id.middleware');

describe('Correlation ID Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { header: jest.fn().mockReturnValue(undefined) };
    res = { set: jest.fn() };
    next = jest.fn();
  });

  it('generates a UUID and attaches it to req.id when no header is supplied', () => {
    correlationId(req, res, next);

    expect(req.id).toEqual(expect.stringMatching(/^[0-9a-f-]{36}$/));
    expect(next).toHaveBeenCalledWith();
  });

  it('sets the correlation ID on the response header', () => {
    correlationId(req, res, next);

    expect(res.set).toHaveBeenCalledWith(CORRELATION_ID_HEADER, req.id);
  });

  it('reuses a well-formed client-supplied correlation ID instead of generating a new one', () => {
    req.header.mockReturnValue('client-supplied-id-123');

    correlationId(req, res, next);

    expect(req.id).toBe('client-supplied-id-123');
    expect(res.set).toHaveBeenCalledWith(CORRELATION_ID_HEADER, 'client-supplied-id-123');
  });

  it('reads the correlation ID from the X-Correlation-ID header', () => {
    correlationId(req, res, next);

    expect(req.header).toHaveBeenCalledWith(CORRELATION_ID_HEADER);
  });

  it('generates a fresh ID when the supplied header contains unsafe characters', () => {
    req.header.mockReturnValue('not valid; <script>alert(1)</script>');

    correlationId(req, res, next);

    expect(req.id).not.toBe('not valid; <script>alert(1)</script>');
    expect(req.id).toEqual(expect.stringMatching(/^[0-9a-f-]{36}$/));
  });

  it('generates a fresh ID when the supplied header is empty', () => {
    req.header.mockReturnValue('');

    correlationId(req, res, next);

    expect(req.id).toEqual(expect.stringMatching(/^[0-9a-f-]{36}$/));
  });

  it('generates a fresh ID when the supplied header exceeds the safe length', () => {
    req.header.mockReturnValue('a'.repeat(65));

    correlationId(req, res, next);

    expect(req.id).toEqual(expect.stringMatching(/^[0-9a-f-]{36}$/));
  });

  it('generates a different ID on every call when none is supplied', () => {
    correlationId(req, res, next);
    const first = req.id;

    correlationId(req, res, next);
    const second = req.id;

    expect(first).not.toBe(second);
  });

  it('calls next with no arguments', () => {
    correlationId(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});
