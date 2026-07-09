const ValidationError = require('../errors/ValidationError');

/**
 * Reusable middleware to validate request against a Zod schema.
 * @param {z.ZodSchema} schema - The Zod schema to validate against.
 */
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    if (error.name === 'ZodError') {
      const errorMessages = error.errors
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      return next(new ValidationError(`Validation failed: ${errorMessages}`));
    }
    next(error);
  }
};

module.exports = { validate };
