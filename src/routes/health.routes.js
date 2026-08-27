const express = require('express');

const createHealthRoutes = ({ prisma, server }) => {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const [databaseCheck, stellarRpcCheck] = await Promise.allSettled([
      prisma.$queryRaw`SELECT 1`,
      server.getLatestLedger(),
    ]);

    const database = databaseCheck.status === 'fulfilled' ? 'ok' : 'error';
    const stellarRpc = stellarRpcCheck.status === 'fulfilled' ? 'ok' : 'error';
    const healthy = database === 'ok' && stellarRpc === 'ok';

    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      service: 'padipay-relayer-api',
      version: '0.1.0',
      dependencies: {
        database,
        stellarRpc,
      },
      timestamp: new Date().toISOString(),
    });
  });

  return router;
};

module.exports = { createHealthRoutes };
