import type { DiscordNotification } from '../types.js';
import { getStateEmoji } from '../config/emojis.js';

/**
 * Discord webhook notifier
 */
export class DiscordNotifier {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = process.env.DISCORD_WEBHOOK_URL || '';
    if (!this.webhookUrl) {
      console.warn(`[${new Date().toISOString()}] - Warning: DISCORD_WEBHOOK_URL not configured`);
    }
  }

  /**
   * Send a simple notification message to Discord
   */
  async sendNotification(notification: DiscordNotification): Promise<void> {
    if (!this.webhookUrl) {
      throw new Error('Discord webhook URL not configured');
    }

    const { patient, analysis } = notification;
    const emoji = getStateEmoji(analysis.state);
    const message = `${emoji} ${patient.prenom} ${patient.nom} - ${analysis.message}`;

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`[${new Date().toISOString()}] - Notification sent for ${patient.prenom} ${patient.nom} (${analysis.state})`);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to send Discord notification: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Send multiple notifications with rate limiting
   * Discord allows max 30 requests per minute per webhook
   */
  async sendBatchNotifications(notifications: DiscordNotification[]): Promise<number> {
    let successCount = 0;
    const delayMs = 2000; // 2 seconds between messages to respect rate limits

    for (const notification of notifications) {
      try {
        await this.sendNotification(notification);
        successCount++;

        // Wait between messages to avoid rate limiting (except for last message)
        if (notifications.indexOf(notification) < notifications.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] - Failed to send notification for ${notification.patient.prenom} ${notification.patient.nom}:`, error);
      }
    }

    return successCount;
  }
}
