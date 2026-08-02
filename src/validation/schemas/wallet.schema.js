const { z } = require('zod');

const withdrawSchema = z.object({
  body: z.object({
    destinationAddress: z.string().min(1, 'Destination address is required'),
    amount: z
      .string()
      .min(1, 'Amount is required')
      .regex(/^\d+(\.\d+)?$/, 'Amount must be a positive number')
      .refine((value) => Number(value) > 0, 'Amount must be greater than zero'),
    asset: z.string().min(1).default('USDC'),
  }),
});

module.exports = { withdrawSchema };
