import express from 'express';
import dotenv from 'dotenv';
import analyzeRoutes from './routes/analyzeRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { testConnection } from './database/connection.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

/**
 * Initialize the Express server
 */
async function main() {
  try {
    // Test database connection
    console.log(`[${new Date().toISOString()}] - 🚀 Analyze Service Starting...`);
    console.log(`[${new Date().toISOString()}] - 📊 REST API for health anomaly analysis`);

    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }

    // Middleware
    app.use(express.json());

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Analysis routes
    app.use('/analyse', analyzeRoutes);

    // Error handler (must be last)
    app.use(errorHandler);

    // Start server
    app.listen(PORT, () => {
      console.log(`[${new Date().toISOString()}] - ✅ Analyze service listening on port ${PORT}`);
      console.log(`[${new Date().toISOString()}] - 📍 Endpoints:`);
      console.log(`[${new Date().toISOString()}] -    GET /health`);
      console.log(`[${new Date().toISOString()}] -    GET /analyse/:stationId/family`);
      console.log(`[${new Date().toISOString()}] -    GET /analyse/:stationId/doctor`);
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] - ❌ Fatal error:`, error);
    process.exit(1);
  }
}

// Start the service
main().catch((error) => {
  console.error(`[${new Date().toISOString()}] - ❌ Unhandled error:`, error);
  process.exit(1);
});
