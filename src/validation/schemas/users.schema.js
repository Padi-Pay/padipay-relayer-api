const { z } = require('zod');

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  }).strict('Unallowed fields in payload'),
});

module.exports = {
  updateProfileSchema,
};
