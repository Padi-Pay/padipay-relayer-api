const { z } = require('zod');

/**
 * Schema for initiating a managed wallet funding (top-up) request.
 *
 * Amounts are represented as strings to safely handle large numbers and are
 * strictly validated to prevent arbitrary amount injections:
 *  - must be a plain positive decimal (no signs, no exponents, no whitespace),
 *    which rejects negative and unparseable formats;
 *  - must be strictly greater than zero.
 */
const fundWalletSchema = z.object({
  body: z.object({
    walletAddress: z.string().min(1, 'Wallet address is required'),
    amount: z
      .string()
      .min(1, 'Amount is required')
      .regex(/^\d+(\.\d+)?$/, 'Amount must be a positive number')
      .refine((value) => Number(value) > 0, 'Amount must be greater than zero'),
    asset: z.string().min(1).default('XLM'),
  }),
});

module.exports = { fundWalletSchema };
