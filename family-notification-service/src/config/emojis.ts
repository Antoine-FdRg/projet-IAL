import type { FamilyState } from '../types.js';

/**
 * Emoji mapping for family states
 */
export const STATE_EMOJIS: Record<FamilyState, string> = {
  great: '☀️',     // Sun - Everything is great
  okay: '☁️',      // Cloud - Slight concerns
  bad: '🌧️',      // Rain - Notable issues
  terrible: '⛈️',  // Storm - Critical situation
};

/**
 * Get emoji for a given state
 */
export function getStateEmoji(state: FamilyState): string {
  return STATE_EMOJIS[state] || '❓';
}
