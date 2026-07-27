const { createEscrowSchema, submitEscrowSchema, escrowActionSchema, syncEscrowSchema } = require('../../../src/validation/schemas/escrow.schema');

describe('Escrow Schemas', () => {
  describe('createEscrowSchema', () => {
    it('should validate correct create escrow payload', () => {
      const payload = {
        body: {
          buyer: 'G_BUYER_ADDRESS',
          seller: 'G_SELLER_ADDRESS',
          amount: '1000',
        }
      };

      const result = createEscrowSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should fail if buyer is missing', () => {
      const payload = { body: { seller: 'G_SELLER_ADDRESS', amount: '1000' } };
      const result = createEscrowSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should fail if seller is missing', () => {
      const payload = { body: { buyer: 'G_BUYER_ADDRESS', amount: '1000' } };
      const result = createEscrowSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should fail if amount is missing', () => {
      const payload = { body: { buyer: 'G_BUYER_ADDRESS', seller: 'G_SELLER_ADDRESS' } };
      const result = createEscrowSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('submitEscrowSchema', () => {
    it('should validate valid action types', () => {
      ['LOCK', 'RELEASE', 'DISPUTE', 'REFUND'].forEach(action => {
        const result = submitEscrowSchema.safeParse({ body: { actionType: action } });
        expect(result.success).toBe(true);
      });
    });

    it('should fail for invalid action type', () => {
      const result = submitEscrowSchema.safeParse({ body: { actionType: 'INVALID' } });
      expect(result.success).toBe(false);
    });
  });

  describe('escrowActionSchema', () => {
    it('should validate when escrow id is provided', () => {
      const result = escrowActionSchema.safeParse({ params: { id: '123' } });
      expect(result.success).toBe(true);
    });

    it('should fail when escrow id is missing', () => {
      const result = escrowActionSchema.safeParse({ params: {} });
      expect(result.success).toBe(false);
    });
  });

  describe('syncEscrowSchema', () => {
    it('should validate a correct synchronization payload', () => {
      const payload = { params: { id: 'intent-1' }, body: { sorobanEscrowId: '42', status: 'SUCCESS' } };
      const result = syncEscrowSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept any recognized transaction status', () => {
      ['SUCCESS', 'FAILED', 'NOT_FOUND', 'PENDING'].forEach((status) => {
        const result = syncEscrowSchema.safeParse({ params: { id: 'intent-1' }, body: { sorobanEscrowId: '42', status } });
        expect(result.success).toBe(true);
      });
    });

    it('should fail when sorobanEscrowId is missing', () => {
      const result = syncEscrowSchema.safeParse({ params: { id: 'intent-1' }, body: { status: 'SUCCESS' } });
      expect(result.success).toBe(false);
    });

    it('should fail for an unrecognized status', () => {
      const result = syncEscrowSchema.safeParse({ params: { id: 'intent-1' }, body: { sorobanEscrowId: '42', status: 'BOGUS' } });
      expect(result.success).toBe(false);
    });

    it('should fail when escrow id param is missing', () => {
      const result = syncEscrowSchema.safeParse({ params: {}, body: { sorobanEscrowId: '42', status: 'SUCCESS' } });
      expect(result.success).toBe(false);
    });
  });
});
