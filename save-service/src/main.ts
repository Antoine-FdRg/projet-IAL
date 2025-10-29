import express from 'express';
import type { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { testConnection, closePool } from './database/connection.js';
import { authenticateBox, type AuthenticatedRequest } from './middleware/authMiddleware.js';
import { SaveService } from './services/saveService.js';
import type { MeasurementList, SaveResponse } from './types.js';

dotenv.config();

const app: Express = express();
const PORT = parseInt(process.env.PORT || '3000');

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /measurements
 * Save measurements from a box
 *
 * Request:
 * - Header: Authorization: Bearer <token>
 * - Body: { boxId: string, dataList: [{ type, value, unit, timestamp }] }
 *
 * Response:
 * - 200: { success: true }
 * - 400: { success: false, message: "error" } - Invalid data
 * - 401: { success: false, message: "error" } - Missing/invalid auth
 * - 403: { success: false, message: "error" } - Box not found or token mismatch
 * - 500: { success: false, message: "error" } - Server error
 */
app.post(
  '/measurements',
  authenticateBox,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data: MeasurementList = req.body;

      // Save measurements
      const result: SaveResponse = await SaveService.saveMeasurements(data);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] - Error in /measurements endpoint:`, error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

/**
 * Start the server
 */
async function startServer() {
  try {
    // Test database connection
    await testConnection();

    // Start listening
    app.listen(PORT, () => {
      console.log(`[${new Date().toISOString()}] - Save service listening on port ${PORT}`);
      console.log(`[${new Date().toISOString()}] - Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] - Failed to start server:`, error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  console.log(`[${new Date().toISOString()}] - Shutting down gracefully...`);
  await closePool();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the application
startServer().catch(console.error);
