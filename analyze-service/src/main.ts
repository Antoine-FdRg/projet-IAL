import { createNotificationClient, testConnection } from './database/connection.js';
import { MeasurementRepository } from './database/measurementRepository.js';
import { AnalysisService } from './services/analysisService.js';
import type { MeasurementNotification } from './types.js';

/**
 * Main entry point for the analyze service
 * Sets up PostgreSQL LISTEN/NOTIFY for real-time measurement analysis
 */
async function main() {
  try {
    // Initialize service
    await AnalysisService.initialize();

    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }

    // Create dedicated client for LISTEN/NOTIFY
    const notificationClient = await createNotificationClient();

    console.log(
      `[${new Date().toISOString()}] - 👂 Setting up LISTEN on 'new_measurement' channel...`
    );

    // Set up notification handler
    notificationClient.on('notification', async (msg) => {
      if (msg.channel === 'new_measurement') {
        try {
          const notification: MeasurementNotification = JSON.parse(msg.payload || '{}');

          console.log(
            `[${new Date().toISOString()}] - 📨 Received notification for measurement ID: ${notification.id}`
          );

          // Fetch full measurement from database
          const measurement = await MeasurementRepository.getById(notification.id);

          if (!measurement) {
            console.error(
              `[${new Date().toISOString()}] - ❌ Measurement ${notification.id} not found in database`
            );
            return;
          }

          // Analyze the measurement
          await AnalysisService.analyzeMeasurement(measurement);
        } catch (error) {
          console.error(
            `[${new Date().toISOString()}] - ❌ Error processing notification:`,
            error
          );
        }
      }
    });

    // Start listening
    await notificationClient.query('LISTEN new_measurement');

    console.log(`[${new Date().toISOString()}] - ✅ Analyze service is now listening for new measurements`);
    console.log(`[${new Date().toISOString()}] - 🔔 Waiting for notifications...`);
    console.log('');

    // Keep the process running
    process.on('SIGINT', async () => {
      console.log(`\n[${new Date().toISOString()}] - 🛑 Shutting down gracefully...`);
      await notificationClient.query('UNLISTEN new_measurement');
      notificationClient.release();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log(`\n[${new Date().toISOString()}] - 🛑 Shutting down gracefully...`);
      await notificationClient.query('UNLISTEN new_measurement');
      notificationClient.release();
      process.exit(0);
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
