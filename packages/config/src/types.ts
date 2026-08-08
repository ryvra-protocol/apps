export type AppId = "markets" | "pay" | "points-tasks";
export type RuntimeMode = "mock" | "http";

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

export interface MarketsIntegrationConfig extends AppConfig {
  compatibilityVersion?: string;
  parityCheckMarker?: string;
  connectivityPath?: string;
  accountId?: string;
}

export interface PointsTasksIntegrationConfig extends AppConfig {
  compatibilityVersion?: string;
  parityCheckMarker?: string;
  connectivityPath?: string;
  accountId?: string;
}
