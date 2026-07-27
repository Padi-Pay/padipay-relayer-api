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

const escrowActionSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Escrow ID is required"),
  }),
});

const syncEscrowSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Escrow ID is required"),
  }),
  body: z.object({
    sorobanEscrowId: z.string().min(1, "On-chain escrow id is required"),
    status: z.enum(['SUCCESS', 'FAILED', 'NOT_FOUND', 'PENDING']),
  }),
});

module.exports = { submitEscrowSchema, createEscrowSchema, escrowActionSchema, syncEscrowSchema };
