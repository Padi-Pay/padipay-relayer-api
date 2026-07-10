const { z } = require('zod');

const submitEscrowSchema = z.object({
  body: z.object({
    actionType: z.enum(['LOCK', 'RELEASE', 'DISPUTE', 'REFUND']),
    params: z.record(z.any()).optional(),
  }),
});

const createEscrowSchema = z.object({
  body: z.object({
    buyer: z.string().min(1, "Buyer address is required"),
    seller: z.string().min(1, "Seller address is required"),
    amount: z.string().min(1, "Amount is required"),
    asset: z.string().optional(),
  }),
});

const lockEscrowSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Escrow ID is required"),
  }),
});

module.exports = { submitEscrowSchema, createEscrowSchema, lockEscrowSchema };
