const express = require('express');
const router = express.Router();
const { validate } = require('../middleware/validate.middleware');
const { submitEscrowSchema } = require('../validation/schemas/escrow.schema');

// TODO: Import escrow service and horizon service (to be implemented in Phase 4)
// const escrowService = require('../services/escrow.service');
// const horizonService = require('../services/horizon.service');

/**
 * POST /submit-escrow
 * Endpoint for the WhatsApp bot to request a new escrow action.
 */
router.post('/submit-escrow', validate(submitEscrowSchema), async (req, res) => {
  // TODO: Link this route to escrowService.processEscrowAction()
  res.status(200).json({ message: 'submit-escrow route scaffolded' });
});

/**
 * GET /status/:txId
 * Endpoint to check the on-chain status of a previously submitted transaction.
 */
router.get('/status/:txId', async (req, res) => {
  const { txId } = req.params;
  // TODO: Link this route to horizonService.getTransactionStatus()
  res.status(200).json({ message: 'status route scaffolded', txId });
});

module.exports = router;
