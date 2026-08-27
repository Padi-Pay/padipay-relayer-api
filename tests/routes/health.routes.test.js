const express = require('express');
const request = require('supertest');
const { createHealthRoutes } = require('../../src/routes/health.routes');

describe('Health Routes', () => {
  const createTestApp = ({ databaseHealthy = true, rpcHealthy = true } = {}) => {
    const prisma = {
      $queryRaw: databaseHealthy ? jest.fn().mockResolvedValue([{ '?column?': 1 }]) : jest.fn().mockRejectedValue(new Error('database unavailable')),
    };
    const server = {
      getLatestLedger: rpcHealthy ? jest.fn().mockResolvedValue({ sequence: 1 }) : jest.fn().mockRejectedValue(new Error('rpc unavailable')),
    };
    const app = express();
    app.use('/health', createHealthRoutes({ prisma, server }));
    return { app, prisma, server };
  };

  it('returns 200 when the database and Stellar RPC are healthy', async () => {
    const { app, prisma, server } = createTestApp();
    const res = await request(app).get('/health');
    
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.dependencies).toEqual({ database: 'ok', stellarRpc: 'ok' });
    expect(res.body.timestamp).toEqual(expect.any(String));
    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(server.getLatestLedger).toHaveBeenCalled();
  });

  it('returns 503 when the database is unavailable', async () => {
    const res = await request(createTestApp({ databaseHealthy: false }).app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.dependencies).toEqual({ database: 'error', stellarRpc: 'ok' });
  });

  it('returns 503 when the Stellar RPC is unavailable', async () => {
    const res = await request(createTestApp({ rpcHealthy: false }).app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.dependencies).toEqual({ database: 'ok', stellarRpc: 'error' });
  });
});
