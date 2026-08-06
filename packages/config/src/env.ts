import { z } from "zod";
import type { AppConfig, AppId, FeatureFlags } from "./types";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  RYVRA_RUNTIME_MODE: z.enum(["mock", "live"]).default("mock"),
  RYVRA_API_BASE_URL: z.string().url().default("http://localhost:4000"),
  RYVRA_FEATURE_MARKETS_ENABLED: z.coerce.boolean().default(true),
  RYVRA_FEATURE_PAY_ENABLED: z.coerce.boolean().default(true),
  RYVRA_FEATURE_POINTS_TASKS_ENABLED: z.coerce.boolean().default(true),
});

function toFeatureFlags(parsedEnv: z.infer<typeof envSchema>): FeatureFlags {
  return {
    marketsEnabled: parsedEnv.RYVRA_FEATURE_MARKETS_ENABLED,
    payEnabled: parsedEnv.RYVRA_FEATURE_PAY_ENABLED,
    pointsTasksEnabled: parsedEnv.RYVRA_FEATURE_POINTS_TASKS_ENABLED,
  };
}

export function loadAppConfig(appId: AppId, env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsedEnv = envSchema.parse(env);

  return {
    appId,
    nodeEnv: parsedEnv.NODE_ENV,
    mode: parsedEnv.RYVRA_RUNTIME_MODE,
    apiBaseUrl: parsedEnv.RYVRA_API_BASE_URL,
    featureFlags: toFeatureFlags(parsedEnv),
  };
}

export function loadMarketsConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return loadAppConfig("markets", env);
}

export function loadPayConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return loadAppConfig("pay", env);
}

export function loadPointsTasksConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return loadAppConfig("points-tasks", env);
}
