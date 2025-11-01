import cron from 'node-cron';
import dotenv from 'dotenv';
import { testUserDbConnection } from './database/userDbConnection.js';
import { testMeasurementDbConnection } from './database/measurementDbConnection.js';
import { PatientRepository } from './database/patientRepository.js';
import { AnalyzeClient } from './services/analyzeClient.js';
import { DiscordNotifier } from './services/discordNotifier.js';
import type { DiscordNotification, ExecutionSummary } from './types.js';

dotenv.config();

/**
 * Main cron job function - executes the notification workflow
 */
async function executeCronJob(): Promise<void> {
  const startTime = new Date();
  console.log(`\n${'='.repeat(80)}`);
  console.log(`[${startTime.toISOString()}] - 🚀 Starting family notification cron job`);
  console.log('='.repeat(80));

  const summary: ExecutionSummary = {
    timestamp: startTime,
    totalPatients: 0,
    successfulNotifications: 0,
    failedAnalyses: 0,
    failedNotifications: 0,
    errors: [],
  };

  try {
    // 1. Fetch all patients with family members
    console.log(`[${new Date().toISOString()}] - 📋 Fetching patients with family members...`);
    const patients = await PatientRepository.getPatientsWithProches();
    summary.totalPatients = patients.length;

    if (patients.length === 0) {
      console.log(`[${new Date().toISOString()}] - ℹ️  No patients with family members found`);
      return;
    }

    // 2. Initialize clients
    const analyzeClient = new AnalyzeClient();
    const discordNotifier = new DiscordNotifier();

    // 3. Process each patient
    const notifications: DiscordNotification[] = [];

    for (const patient of patients) {
      try {
        console.log(`[${new Date().toISOString()}] - 🔍 Analyzing patient: ${patient.prenom} ${patient.nom} (${patient.station_token})`);

        // Get analysis from analyze-service
        const analysis = await analyzeClient.getFamilyAnalysis(patient.station_token);

        // Prepare notification
        notifications.push({ patient, analysis });

        console.log(`[${new Date().toISOString()}] - ✅ Analysis complete: ${analysis.state} - ${analysis.message}`);
      } catch (error) {
        summary.failedAnalyses++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        summary.errors.push({
          patient: `${patient.prenom} ${patient.nom}`,
          error: `Analysis failed: ${errorMsg}`,
        });
        console.error(`[${new Date().toISOString()}] - ❌ Failed to analyze patient ${patient.prenom} ${patient.nom}:`, errorMsg);
        // Continue with next patient (as per user requirement: "Logger et continuer")
      }
    }

    // 4. Send Discord notifications
    if (notifications.length > 0) {
      console.log(`\n[${new Date().toISOString()}] - 📤 Sending ${notifications.length} Discord notifications...`);
      const sentCount = await discordNotifier.sendBatchNotifications(notifications);
      summary.successfulNotifications = sentCount;
      summary.failedNotifications = notifications.length - sentCount;
      console.log(`[${new Date().toISOString()}] - 📨 Sent ${sentCount}/${notifications.length} notifications`);
    }

  } catch (error) {
    console.error(`[${new Date().toISOString()}] - ❌ Critical error in cron job:`, error);
    summary.errors.push({
      patient: 'N/A',
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    // Print summary
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;

    console.log(`\n${'='.repeat(80)}`);
    console.log(`[${endTime.toISOString()}] - 📊 Cron Job Summary`);
    console.log('='.repeat(80));
    console.log(`Total patients:               ${summary.totalPatients}`);
    console.log(`Successful notifications:     ${summary.successfulNotifications}`);
    console.log(`Failed analyses:              ${summary.failedAnalyses}`);
    console.log(`Failed notifications:         ${summary.failedNotifications}`);
    console.log(`Execution time:               ${duration.toFixed(2)}s`);

    if (summary.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered:`);
      summary.errors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err.patient}: ${err.error}`);
      });
    }

    console.log('='.repeat(80));
  }
}

/**
 * Initialize the service
 */
async function main() {
  try {
    console.log(`[${new Date().toISOString()}] - 🚀 Family Notification Service Starting...`);
    console.log(`[${new Date().toISOString()}] - 📅 Cron-based Discord notifications for family members`);

    // Test database connections
    console.log(`\n[${new Date().toISOString()}] - 🔌 Testing database connections...`);
    const userDbConnected = await testUserDbConnection();
    const measurementDbConnected = await testMeasurementDbConnection();

    if (!userDbConnected) {
      throw new Error('Failed to connect to user-db');
    }

    if (!measurementDbConnected) {
      console.warn(`[${new Date().toISOString()}] - ⚠️  Warning: measurement-db connection failed (not critical for current functionality)`);
    }

    // Validate configuration
    const cronSchedule = process.env.CRON_SCHEDULE || '*/10 * * * *';
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn(`[${new Date().toISOString()}] - ⚠️  Warning: DISCORD_WEBHOOK_URL not configured - notifications will fail`);
    }

    // Validate cron schedule
    if (!cron.validate(cronSchedule)) {
      throw new Error(`Invalid cron schedule: ${cronSchedule}`);
    }

    console.log(`\n[${new Date().toISOString()}] - ⏰ Cron schedule configured: ${cronSchedule}`);
    console.log(`[${new Date().toISOString()}] - 📍 Analyze service URL: ${process.env.ANALYZE_SERVICE_URL || 'http://analyze-service:3001'}`);
    console.log(`[${new Date().toISOString()}] - 🔔 Discord webhook: ${webhookUrl ? 'Configured ✓' : 'Not configured ✗'}`);

    // Schedule the cron job
    console.log(`\n[${new Date().toISOString()}] - ✅ Service ready - waiting for cron schedule...`);
    console.log(`[${new Date().toISOString()}] - 💡 Tip: Next execution will be according to schedule: ${cronSchedule}`);

    cron.schedule(cronSchedule, async () => {
      await executeCronJob();
    });

    // Optional: Run immediately on startup for testing
    if (process.env.RUN_ON_STARTUP === 'true') {
      console.log(`\n[${new Date().toISOString()}] - 🏃 RUN_ON_STARTUP enabled - executing job immediately...`);
      await executeCronJob();
    }

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
