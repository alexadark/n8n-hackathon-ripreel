/**
 * Client-side environment variables
 * In Vite, client env vars must be prefixed with VITE_
 */
export const clientEnv = {
  APP_URL: import.meta.env.VITE_APP_URL || "http://localhost:5173",
  BIBLE_CHARACTER_WEBHOOK: import.meta.env.VITE_BIBLE_CHARACTER_WEBHOOK,
  BIBLE_LOCATION_WEBHOOK: import.meta.env.VITE_BIBLE_LOCATION_WEBHOOK,
  BIBLE_PROP_WEBHOOK: import.meta.env.VITE_BIBLE_PROP_WEBHOOK,
} as const;

export type ClientEnv = typeof clientEnv;
