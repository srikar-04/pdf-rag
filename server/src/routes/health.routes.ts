import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { qdrantClient } from '../lib/qdrant.client.js';

const router = Router();

/**
 * Liveness Probe
 * 
 * Purpose: Is the application process running?
 * Used by: Kubernetes livenessProbe
 * Response: 200 if running, 500 if process crashed
 * 
 * This should be lightweight - just check the process is alive
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version,
  });
});

/**
 * Readiness Probe
 * 
 * Purpose: Is the application ready to serve traffic?
 * Used by: Kubernetes readinessProbe, load balancers
 * Response: 200 if ready, 503 if not ready
 * 
 * Checks all critical dependencies:
 * - Database connectivity
 * - Vector database connectivity
 * 
 * Why 503? It's the standard HTTP code for "Service Unavailable"
 * Load balancers will stop routing traffic until ready
 */
router.get('/ready', async (req, res) => {
  const checks = await Promise.all([
    checkDatabase(),
    checkQdrant(),
  ]);
  
  const results = checks.reduce((acc, check) => ({
    ...acc,
    [check.name]: {
      healthy: check.healthy,
      latencyMs: check.latencyMs,
      ...(check.error && { error: check.error }),
    },
  }), {});
  
  const allHealthy = checks.every(c => c.healthy);
  
  if (allHealthy) {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: results,
    });
  } else {
    console.warn('Readiness check failed:', results);
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      checks: results,
    });
  }
});

/**
 * Database Health Check
 */
async function checkDatabase() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      name: 'database',
      healthy: true,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'database',
      healthy: false,
      latencyMs: Date.now() - start,
      error: (error as Error).message,
    };
  }
}

/**
 * Qdrant Health Check
 */
async function checkQdrant() {
  const start = Date.now();
  try {
    await qdrantClient.getCollections();
    return {
      name: 'qdrant',
      healthy: true,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'qdrant',
      healthy: false,
      latencyMs: Date.now() - start,
      error: (error as Error).message,
    };
  }
}

export default router;
