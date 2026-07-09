const { z } = require('zod');

const submitEscrowSchema = z.object({
  body: z.object({
    actionType: z.enum(['LOCK', 'RELEASE', 'DISPUTE', 'REFUND']),
    params: z.record(z.any()).optional(),
  }),
});

module.exports = { submitEscrowSchema };
