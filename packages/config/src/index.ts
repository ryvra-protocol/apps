export type { AppId, RuntimeMode, FeatureFlags, AppConfig } from "./types";
export { loadAppConfig, loadMarketsConfig, loadPayConfig, loadPointsTasksConfig } from "./env";
export {
  routeRegistry,
  getGlobalNavItems,
  getProductNav,
  buildDeepLink,
  parseDeepLink,
} from "./routing";
export type {
  ProductId,
  ProductBaseUrls,
  RouteDefinition,
  ResolvedRouteDefinition,
  RoutePermissionMeta,
  RouteResolutionOptions,
  DeepLinkContract,
  BuildDeepLinkInput,
  ParsedDeepLink,
} from "./routing";
