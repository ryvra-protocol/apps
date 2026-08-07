import { z } from "zod";
import type { AppConfig, AppId, FeatureFlags, RuntimeMode } from "./types";

const runtimeModeSchema = z.enum(["mock", "http", "live"]);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  RYVRA_RUNTIME_MODE: runtimeModeSchema.default("mock"),
  RYVRA_API_BASE_URL: z.string().url().default("http://localhost:4000"),
  RYVRA_PAY_RUNTIME_MODE: runtimeModeSchema.optional(),
  RYVRA_PAY_API_BASE_URL: z.string().url().optional(),
  RYVRA_FEATURE_MARKETS_ENABLED: z.coerce.boolean().default(true),
  RYVRA_FEATURE_PAY_ENABLED: z.coerce.boolean().default(true),
  RYVRA_FEATURE_POINTS_TASKS_ENABLED: z.coerce.boolean().default(true),
});

function normalizeRuntimeMode(value: z.infer<typeof runtimeModeSchema>): RuntimeMode {
  return value === "live" ? "http" : value;
}

function toFeatureFlags(parsedEnv: z.infer<typeof envSchema>): FeatureFlags {
  return {
    marketsEnabled: parsedEnv.RYVRA_FEATURE_MARKETS_ENABLED,
    payEnabled: parsedEnv.RYVRA_FEATURE_PAY_ENABLED,
    pointsTasksEnabled: parsedEnv.RYVRA_FEATURE_POINTS_TASKS_ENABLED,
  };
}

function resolveMode(appId: AppId, parsedEnv: z.infer<typeof envSchema>): RuntimeMode {
  if (appId === "pay" && parsedEnv.RYVRA_PAY_RUNTIME_MODE) {
    return normalizeRuntimeMode(parsedEnv.RYVRA_PAY_RUNTIME_MODE);
  }

  return normalizeRuntimeMode(parsedEnv.RYVRA_RUNTIME_MODE);
}

function resolveApiBaseUrl(appId: AppId, parsedEnv: z.infer<typeof envSchema>): string {
  if (appId === "pay" && parsedEnv.RYVRA_PAY_API_BASE_URL) {
    return parsedEnv.RYVRA_PAY_API_BASE_URL;
  }

  return parsedEnv.RYVRA_API_BASE_URL;
}

export function loadAppConfig(appId: AppId, env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsedEnv = envSchema.parse(env);

  return {
    appId,
    nodeEnv: parsedEnv.NODE_ENV,
    mode: resolveMode(appId, parsedEnv),
    apiBaseUrl: resolveApiBaseUrl(appId, parsedEnv),
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
