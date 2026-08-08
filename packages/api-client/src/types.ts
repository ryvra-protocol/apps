import type {
  InstrumentDto,
  InstrumentFilters,
  InstrumentSummaryDto,
  MarketsAccountScopedListRequest,
  MarketsAccountScopedRequest,
  MarketsAccountScopedSummaryRequest,
  MarketsListRequest,
  MarketsListResponse,
  MarketsOverviewDto,
  OrderDto,
  OrderFilters,
  OrderSummaryDto,
  PositionDto,
  PositionFilters,
  PositionSummaryDto,
} from "@ryvra/domain-markets";
import type {
  InvoiceDto,
  InvoiceFilters,
  InvoiceSummaryDto,
  PayListRequest,
  PayListResponse,
  PayOverviewDto,
  PaymentIntent,
  PaymentIntentState,
  PayoutDto,
  PayoutFilters,
  PayoutSummaryDto,
  ReconciliationFilters,
  ReconciliationItemDto,
  ReconciliationResult,
  ReconciliationSummaryDto,
  SettlementSnapshot,
  SubscriptionDto,
} from "@ryvra/domain-payments";
import type {
  PointEntryDto,
  PointEntryFilters,
  PointSummaryDto,
  PointsAccountScopedListRequest,
  PointsAccountScopedRequest,
  PointsAccountScopedSummaryRequest,
  PointsListResponse,
  PointsOverviewDto,
} from "@ryvra/domain-points";
import type {
  TaskDto,
  TaskFilters,
  TaskSummaryDto,
  TasksAccountScopedListRequest,
  TasksAccountScopedRequest,
  TasksAccountScopedSummaryRequest,
  TasksListResponse,
  TasksOverviewDto,
} from "@ryvra/domain-tasks";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiErrorSource =
  | "mock"
  | "http"
  | "runtime"
  | "unknown"
  | "points-tasks-api"
  | "markets-api"
  | "policy-risk"
  | "asset-registry"
  | "execution-router"
  | "ledger-settlement"
  | "accounts-runtime";

export interface ApiRequest {
  method: HttpMethod;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface ApiError {
  code: string;
  message: string;
  retryable: boolean;
  source: ApiErrorSource;
  status?: number;
  details?: unknown;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: ApiError;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export interface Transport {
  request<T>(request: ApiRequest): Promise<ApiResult<T>>;
}

export interface PayRequestOptions {
  authToken?: string;
  requestId?: string;
  correlationId?: string;
  idempotencyKey?: string;
  headers?: Record<string, string>;
}

export interface PayRuntimeHeaderOptions {
  authToken?: string;
  authTokenProvider?: () => string | undefined;
  authScheme?: string;
  requestIdHeader?: string;
  requestIdProvider?: () => string;
  correlationIdHeader?: string;
  correlationIdProvider?: () => string;
  idempotencyHeader?: string;
  staticHeaders?: Record<string, string>;
  connectivityPath?: string;
}

export interface MarketsRuntimeHeaderOptions {
  authToken?: string;
  authTokenProvider?: () => string | undefined;
  authScheme?: string;
  requestIdHeader?: string;
  requestIdProvider?: () => string;
  correlationIdHeader?: string;
  correlationIdProvider?: () => string;
  staticHeaders?: Record<string, string>;
  connectivityPath?: string;
  defaultAccountId?: string;
}

export interface PointsTasksRuntimeHeaderOptions {
  authToken?: string;
  authTokenProvider?: () => string | undefined;
  authScheme?: string;
  requestIdHeader?: string;
  requestIdProvider?: () => string;
  correlationIdHeader?: string;
  correlationIdProvider?: () => string;
  staticHeaders?: Record<string, string>;
  connectivityPath?: string;
  defaultAccountId?: string;
}

export interface PayConnectivityCheckResult {
  checkedAt: string;
  path: string;
  ok: boolean;
  source: ApiErrorSource;
  status?: number;
  message: string;
}

export interface PayParityDiagnostics {
  mode: ApiClientMode;
  baseUrl: string;
  compatibilityVersion: string;
  sourceOfTruth: string;
  parityCheckMarker: string;
  connectivity: PayConnectivityCheckResult;
}

export interface MarketsConnectivityCheckResult {
  checkedAt: string;
  path: string;
  ok: boolean;
  source: ApiErrorSource;
  status?: number;
  message: string;
}

export interface MarketsParityDiagnostics {
  mode: ApiClientMode;
  baseUrl: string;
  compatibilityVersion: string;
  sourceOfTruth: string;
  sourceOpenApiPath: string;
  sourceChangelogPath: string;
  sourceOpenApiSha: string;
  sourceOpenApiCommit: string;
  parityCheckMarker: string;
  auth: {
    requiredForMarketsRoutes: boolean;
    hasAuthorization: boolean;
    requestIdHeader: string;
    correlationIdHeader: string;
  };
  accountScope: {
    defaultAccountId?: string;
    requiredEndpoints: readonly string[];
  };
  paginationPolicy: {
    preferredMode: "cursor";
    deprecatedParam: "page";
    deprecatedRemovalNotBefore: "2027-02-08";
  };
  deprecatedFieldFallback: {
    canonicalField: "net_exposure_band";
    fallbackField: "net_exposure_bucket";
    fallbackRemovalNotBefore: "2027-02-08";
  };
  connectivity: MarketsConnectivityCheckResult;
}

export interface PointsTasksConnectivityCheckResult {
  checkedAt: string;
  path: string;
  ok: boolean;
  source: ApiErrorSource;
  status?: number;
  message: string;
}

export interface PointsTasksParityDiagnostics {
  mode: ApiClientMode;
  baseUrl: string;
  compatibilityVersion: string;
  sourceOfTruth: string;
  sourcePolicy: string;
  sourceProtocolDocPath: string;
  sourceProtocolFaqPath: string;
  sourceContractsEventsPath: string;
  sourceContractsIdsPath: string;
  sourcePolicyDocPath: string;
  sourceContractSchemaVersion: string;
  sourceOpenApiPublished: false;
  parityCheckMarker: string;
  auth: {
    requiredForPointsTasksRoutes: boolean;
    statusRouteAuthOptional: boolean;
    hasAuthorization: boolean;
    requestIdHeader: string;
    correlationIdHeader: string;
  };
  accountScope: {
    defaultAccountId?: string;
    requiredField: "account_id";
    requiredEndpoints: readonly string[];
  };
  paginationPolicy: {
    preferredMode: "cursor";
    deprecatedParam: "page";
    deprecatedRemovalNotBefore: "2027-06-30";
  };
  deprecatedFieldFallback: {
    pointsCanonicalField: "running_balance";
    pointsFallbackField: "balance_after";
    tasksCanonicalField: "progress_percent";
    tasksFallbackField: "progress";
    fallbackRemovalNotBefore: "2027-06-30";
  };
  connectivity: PointsTasksConnectivityCheckResult;
}

export interface MarketsClient {
  listInstruments(request?: MarketsListRequest<InstrumentFilters>): Promise<MarketsListResponse<InstrumentDto>>;
  getInstrumentSummary(filters?: InstrumentFilters): Promise<InstrumentSummaryDto>;
  listOrders(request: MarketsAccountScopedListRequest<OrderFilters>): Promise<MarketsListResponse<OrderDto>>;
  getOrderSummary(request: MarketsAccountScopedSummaryRequest<OrderFilters>): Promise<OrderSummaryDto>;
  listPositions(request: MarketsAccountScopedListRequest<PositionFilters>): Promise<MarketsListResponse<PositionDto>>;
  getPositionSummary(request: MarketsAccountScopedSummaryRequest<PositionFilters>): Promise<PositionSummaryDto>;
  getMarketsOverview(request: MarketsAccountScopedRequest): Promise<MarketsOverviewDto>;
  getParityDiagnostics(): Promise<MarketsParityDiagnostics>;
}

export interface PayClient {
  listInvoices(request?: PayListRequest<InvoiceFilters>): Promise<PayListResponse<InvoiceDto>>;
  getInvoiceSummary(filters?: InvoiceFilters): Promise<InvoiceSummaryDto>;
  listPayouts(request?: PayListRequest<PayoutFilters>): Promise<PayListResponse<PayoutDto>>;
  getPayoutSummary(filters?: PayoutFilters): Promise<PayoutSummaryDto>;
  listReconciliationItems(
    request?: PayListRequest<ReconciliationFilters>,
  ): Promise<PayListResponse<ReconciliationItemDto>>;
  getReconciliationSummary(filters?: ReconciliationFilters): Promise<ReconciliationSummaryDto>;
  getPayOverview(): Promise<PayOverviewDto>;
  listSubscriptions(): Promise<SubscriptionDto[]>;
  createPaymentIntent(intent: PaymentIntent, options?: PayRequestOptions): Promise<PaymentIntent>;
  transitionPaymentIntent(intentId: string, toState: PaymentIntentState, options?: PayRequestOptions): Promise<PaymentIntent>;
  reconcileSettlement(
    intent: PaymentIntent,
    settlement: SettlementSnapshot,
    options?: PayRequestOptions,
  ): Promise<ReconciliationResult>;
  getParityDiagnostics(): Promise<PayParityDiagnostics>;
}

export interface PointsTasksClient {
  listPointEntries(request: PointsAccountScopedListRequest<PointEntryFilters>): Promise<PointsListResponse<PointEntryDto>>;
  getPointSummary(request: PointsAccountScopedSummaryRequest<PointEntryFilters>): Promise<PointSummaryDto>;
  getPointsOverview(request: PointsAccountScopedRequest): Promise<PointsOverviewDto>;
  listTasks(request: TasksAccountScopedListRequest<TaskFilters>): Promise<TasksListResponse<TaskDto>>;
  getTaskSummary(request: TasksAccountScopedSummaryRequest<TaskFilters>): Promise<TaskSummaryDto>;
  getTasksOverview(request: TasksAccountScopedRequest): Promise<TasksOverviewDto>;
  getParityDiagnostics(): Promise<PointsTasksParityDiagnostics>;
}

export interface ApiClient {
  markets: MarketsClient;
  pay: PayClient;
  pointsTasks: PointsTasksClient;
}

export type ApiClientMode = "mock" | "http";

export interface CreateApiClientOptions {
  mode?: ApiClientMode;
  baseUrl?: string;
  transport?: Transport;
  markets?: MarketsRuntimeHeaderOptions;
  marketsCompatibilityVersion?: string;
  marketsParityCheckMarker?: string;
  pay?: PayRuntimeHeaderOptions;
  payCompatibilityVersion?: string;
  payParityCheckMarker?: string;
  pointsTasks?: PointsTasksRuntimeHeaderOptions;
  pointsTasksCompatibilityVersion?: string;
  pointsTasksParityCheckMarker?: string;
}

export type CreatePayClientOptions = CreateApiClientOptions;
