import { z } from "zod";
import type {
  AppConfig,
  AppId,
  FeatureFlags,
  MarketsIntegrationConfig,
  PointsTasksIntegrationConfig,
  RuntimeMode,
} from "./types";

const runtimeModeSchema = z.enum(["mock", "http", "live"]);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  RYVRA_RUNTIME_MODE: runtimeModeSchema.default("mock"),
  RYVRA_API_BASE_URL: z.string().url().default("http://localhost:4000"),
  RYVRA_PAY_RUNTIME_MODE: runtimeModeSchema.optional(),
  RYVRA_PAY_API_BASE_URL: z.string().url().optional(),
  RYVRA_MARKETS_COMPATIBILITY_VERSION: z.string().optional(),
  RYVRA_MARKETS_PARITY_CHECK_MARKER: z.string().optional(),
  RYVRA_MARKETS_CONNECTIVITY_PATH: z.string().optional(),
  RYVRA_MARKETS_ACCOUNT_ID: z.string().optional(),
  RYVRA_MARKETS_AUTH_TOKEN: z.string().optional(),
  RYVRA_POINTS_TASKS_COMPATIBILITY_VERSION: z.string().optional(),
  RYVRA_POINTS_TASKS_PARITY_CHECK_MARKER: z.string().optional(),
  RYVRA_POINTS_TASKS_CONNECTIVITY_PATH: z.string().optional(),
  RYVRA_POINTS_TASKS_ACCOUNT_ID: z.string().optional(),
  RYVRA_POINTS_TASKS_AUTH_TOKEN: z.string().optional(),
  RYVRA_FEATURE_MARKETS_ENABLED: z.coerce.boolean().default(true),
  RYVRA_FEATURE_PAY_ENABLED: z.coerce.boolean().default(true),
  RYVRA_FEATURE_POINTS_TASKS_ENABLED: z.coerce.boolean().default(true),
});

type ParsedEnv = z.infer<typeof envSchema>;

function parseEnv(env: NodeJS.ProcessEnv): ParsedEnv {
  const parsed = envSchema.safeParse(env);

  if (parsed.success) {
    return parsed.data;
  }

  const issues = parsed.error.issues
    .map((issue) => {
      const path = issue.path.join(".") || "env";
      return `${path}: ${issue.message}`;
    })
    .join("; ");

  throw new Error(`[config] Invalid environment configuration: ${issues}`);
}

function normalizeRuntimeMode(value: z.infer<typeof runtimeModeSchema>): RuntimeMode {
  return value === "live" ? "http" : value;
}

function toFeatureFlags(parsedEnv: ParsedEnv): FeatureFlags {
  return {
    marketsEnabled: parsedEnv.RYVRA_FEATURE_MARKETS_ENABLED,
    payEnabled: parsedEnv.RYVRA_FEATURE_PAY_ENABLED,
    pointsTasksEnabled: parsedEnv.RYVRA_FEATURE_POINTS_TASKS_ENABLED,
  };
}

function resolveMode(appId: AppId, parsedEnv: ParsedEnv): RuntimeMode {
  if (appId === "pay" && parsedEnv.RYVRA_PAY_RUNTIME_MODE) {
    return normalizeRuntimeMode(parsedEnv.RYVRA_PAY_RUNTIME_MODE);
  }

  return normalizeRuntimeMode(parsedEnv.RYVRA_RUNTIME_MODE);
}

function resolveApiBaseUrl(appId: AppId, parsedEnv: ParsedEnv): string {
  if (appId === "pay" && parsedEnv.RYVRA_PAY_API_BASE_URL) {
    return parsedEnv.RYVRA_PAY_API_BASE_URL;
  }

  return parsedEnv.RYVRA_API_BASE_URL;
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function assertRequiredHttpVars(appId: AppId, mode: RuntimeMode, parsedEnv: ParsedEnv): void {
  if (mode !== "http") {
    return;
  }

  if (appId === "markets" && !normalizeOptionalString(parsedEnv.RYVRA_MARKETS_AUTH_TOKEN)) {
    throw new Error(
      "[config] RYVRA_MARKETS_AUTH_TOKEN is required in http mode for Markets non-health routes. Set RYVRA_MARKETS_AUTH_TOKEN or switch RYVRA_RUNTIME_MODE=mock.",
    );
  }

  if (appId === "points-tasks" && !normalizeOptionalString(parsedEnv.RYVRA_POINTS_TASKS_AUTH_TOKEN)) {
    throw new Error(
      "[config] RYVRA_POINTS_TASKS_AUTH_TOKEN is required in http mode for Points/Tasks canonical routes. Set RYVRA_POINTS_TASKS_AUTH_TOKEN or switch RYVRA_RUNTIME_MODE=mock.",
    );
  }
}

export function loadAppConfig(appId: AppId, env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsedEnv = parseEnv(env);
  const mode = resolveMode(appId, parsedEnv);

  assertRequiredHttpVars(appId, mode, parsedEnv);

  return {
    appId,
    nodeEnv: parsedEnv.NODE_ENV,
    mode,
    apiBaseUrl: resolveApiBaseUrl(appId, parsedEnv),
    featureFlags: toFeatureFlags(parsedEnv),
  };
}

export function loadMarketsConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return loadAppConfig("markets", env);
}

export function loadMarketsIntegrationConfig(env: NodeJS.ProcessEnv = process.env): MarketsIntegrationConfig {
  const base = loadMarketsConfig(env);
  const parsedEnv = parseEnv(env);
  const compatibilityVersion = normalizeOptionalString(parsedEnv.RYVRA_MARKETS_COMPATIBILITY_VERSION);
  const parityCheckMarker = normalizeOptionalString(parsedEnv.RYVRA_MARKETS_PARITY_CHECK_MARKER);
  const connectivityPath = normalizeOptionalString(parsedEnv.RYVRA_MARKETS_CONNECTIVITY_PATH);
  const accountId = normalizeOptionalString(parsedEnv.RYVRA_MARKETS_ACCOUNT_ID);

  return {
    ...base,
    ...(compatibilityVersion ? { compatibilityVersion } : {}),
    ...(parityCheckMarker ? { parityCheckMarker } : {}),
    ...(connectivityPath ? { connectivityPath } : {}),
    ...(accountId ? { accountId } : {}),
  };
}

export function loadPayConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return loadAppConfig("pay", env);
}

export function loadPointsTasksConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return loadAppConfig("points-tasks", env);
}

export function loadPointsTasksIntegrationConfig(env: NodeJS.ProcessEnv = process.env): PointsTasksIntegrationConfig {
  const base = loadPointsTasksConfig(env);
  const parsedEnv = parseEnv(env);
  const compatibilityVersion = normalizeOptionalString(parsedEnv.RYVRA_POINTS_TASKS_COMPATIBILITY_VERSION);
  const parityCheckMarker = normalizeOptionalString(parsedEnv.RYVRA_POINTS_TASKS_PARITY_CHECK_MARKER);
  const connectivityPath = normalizeOptionalString(parsedEnv.RYVRA_POINTS_TASKS_CONNECTIVITY_PATH);
  const accountId = normalizeOptionalString(parsedEnv.RYVRA_POINTS_TASKS_ACCOUNT_ID);

  return {
    ...base,
    ...(compatibilityVersion ? { compatibilityVersion } : {}),
    ...(parityCheckMarker ? { parityCheckMarker } : {}),
    ...(connectivityPath ? { connectivityPath } : {}),
    ...(accountId ? { accountId } : {}),
  };
}
