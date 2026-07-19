const { fundWalletSchema } = require('../../../src/validation/schemas/funding.schema');

describe('Funding Schemas', () => {
  describe('fundWalletSchema', () => {
    const validBody = { walletAddress: 'G_WALLET_ADDRESS', amount: '1000' };

    it('should validate a correct funding payload', () => {
      const result = fundWalletSchema.safeParse({ body: validBody });
      expect(result.success).toBe(true);
    });

    it('should default the asset to XLM when omitted', () => {
      const result = fundWalletSchema.safeParse({ body: validBody });
      expect(result.success).toBe(true);
      expect(result.data.body.asset).toBe('XLM');
    });

    it('should accept a decimal amount', () => {
      const result = fundWalletSchema.safeParse({
        body: { ...validBody, amount: '10.50' },
      });
      expect(result.success).toBe(true);
    });

    it('should reject a missing amount', () => {
      const result = fundWalletSchema.safeParse({
        body: { walletAddress: 'G_WALLET_ADDRESS' },
      });
      expect(result.success).toBe(false);
    });

    it('should reject a negative amount', () => {
      const result = fundWalletSchema.safeParse({
        body: { ...validBody, amount: '-100' },
      });
      expect(result.success).toBe(false);
    });

    it('should reject a zero amount', () => {
      const result = fundWalletSchema.safeParse({
        body: { ...validBody, amount: '0' },
      });
      expect(result.success).toBe(false);
    });

    it('should reject an unparseable amount', () => {
      const result = fundWalletSchema.safeParse({
        body: { ...validBody, amount: 'abc' },
      });
      expect(result.success).toBe(false);
    });

    it('should reject an amount sent as a number (must be a string)', () => {
      const result = fundWalletSchema.safeParse({
        body: { ...validBody, amount: 100 },
      });
      expect(result.success).toBe(false);
    });

    it('should reject a missing wallet address', () => {
      const result = fundWalletSchema.safeParse({ body: { amount: '1000' } });
      expect(result.success).toBe(false);
    });
  });
});
