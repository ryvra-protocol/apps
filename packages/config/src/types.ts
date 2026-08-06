export type AppId = "markets" | "pay" | "points-tasks";
export type RuntimeMode = "mock" | "live";

export interface FeatureFlags {
  marketsEnabled: boolean;
  payEnabled: boolean;
  pointsTasksEnabled: boolean;
}

export interface AppConfig {
  appId: AppId;
  nodeEnv: "development" | "test" | "production";
  mode: RuntimeMode;
  apiBaseUrl: string;
  featureFlags: FeatureFlags;
}
