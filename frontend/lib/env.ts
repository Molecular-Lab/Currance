/**
 * Environment configuration
 * Fetches config from server-side API to keep secrets private
 */

interface EnvConfig {
  PRIMUS_APP_ID: string;
  PRIMUS_APP_SECRET: string;
  API_URL: string;
}

let ENV: EnvConfig | null = null;

export async function loadEnv(): Promise<EnvConfig> {
  if (ENV) return ENV;

  try {
    const response = await fetch("/api/config");
    if (!response.ok) {
      throw new Error("Failed to fetch config");
    }
    const config = await response.json();
    ENV = {
      PRIMUS_APP_ID: config.primusAppId,
      PRIMUS_APP_SECRET: config.primusAppSecret,
      API_URL: config.apiUrl,
    };
    return ENV;
  } catch (error) {
    console.error("Error loading env config:", error);
    throw error;
  }
}

export function getEnv(): EnvConfig | null {
  return ENV;
}
