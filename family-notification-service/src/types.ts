/**
 * Patient information from user-db
 */
export interface Patient {
  nss: string;
  nom: string;
  prenom: string;
  station_token: string;
}

/**
 * Family analysis result from analyze-service
 */
export type FamilyState = 'great' | 'okay' | 'bad' | 'terrible';

export interface FamilyAnalysisResult {
  state: FamilyState;
  message: string;
}

/**
 * Discord notification payload
 */
export interface DiscordNotification {
  patient: Patient;
  analysis: FamilyAnalysisResult;
}

/**
 * Cron job execution summary
 */
export interface ExecutionSummary {
  timestamp: Date;
  totalPatients: number;
  successfulNotifications: number;
  failedAnalyses: number;
  failedNotifications: number;
  errors: Array<{ patient: string; error: string }>;
}
