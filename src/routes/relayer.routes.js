const express = require('express');
const { validate } = require('../middleware/validate.middleware');
const { submitEscrowSchema, createEscrowSchema } = require('../validation/schemas/escrow.schema');

/**
 * Factory to create relayer routes with injected dependencies.
 */
const createRelayerRoutes = ({ escrowService, stellarService, horizonService }) => {
  const router = express.Router();

  /**
   * POST /create-escrow
   * Creates a new escrow agreement on-chain.
   */
  router.post('/create-escrow', validate(createEscrowSchema), async (req, res, next) => {
    try {
      const { unsignedXdr, escrowIntentId } = await escrowService.createEscrow(req.body);
      const signedXdr = stellarService.signTransaction(unsignedXdr);
      const result = await stellarService.submitTransaction(signedXdr);
      
      await escrowService.recordTransaction(escrowIntentId, result.hash, 'SUCCESS'); // Assuming success for now

      res.status(200).json({
        message: 'Escrow created successfully',
        result,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /submit-escrow
   * Endpoint for the WhatsApp bot to request an escrow lifecycle action.
   */
  router.post('/submit-escrow', validate(submitEscrowSchema), async (req, res, next) => {
    try {
      const { actionType, params } = req.body;
      
      if (!params || !params.id) {
        return res.status(400).json({ message: 'Escrow ID is required in params' });
      }

      let unsignedXdr;
      let escrowIntentId;
      const escrowId = params.id;

      switch (actionType) {
        case 'LOCK':
          ({ unsignedXdr, escrowIntentId } = await escrowService.lockEscrow({ escrowId }));
          break;
        case 'RELEASE':
          ({ unsignedXdr, escrowIntentId } = await escrowService.releaseEscrow({ escrowId }));
          break;
        case 'REFUND':
          ({ unsignedXdr, escrowIntentId } = await escrowService.refundEscrow({ escrowId }));
          break;
        case 'DISPUTE':
          throw new Error('DISPUTE action not yet implemented in service layer.');
        default:
          throw new Error(`Unsupported actionType: ${actionType}`);
      }

      const signedXdr = stellarService.signTransaction(unsignedXdr);
      const result = await stellarService.submitTransaction(signedXdr);
      
      await escrowService.recordTransaction(escrowIntentId, result.hash, 'SUCCESS');

      res.status(200).json({
        message: `Escrow ${actionType} action submitted successfully`,
        result,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /status/:txId
   * Endpoint to check the on-chain status of a previously submitted transaction.
   */
  router.get('/status/:txId', async (req, res, next) => {
    try {
      const { txId } = req.params;
      const status = await horizonService.getTransactionStatus(txId);
      
      res.status(200).json({
        message: 'Transaction status retrieved',
        status,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};

module.exports = { createRelayerRoutes };
