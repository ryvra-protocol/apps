import type { AssetDto, ExecutionIntent, OrderDto, PositionDto } from "@ryvra/domain-markets";
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
import type { ConversionPreviewDto, EligibilityResult } from "@ryvra/domain-tokenomics";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiErrorSource = "mock" | "http" | "runtime" | "unknown";

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

export interface MarketsClient {
  listAssets(): Promise<AssetDto[]>;
  listPositions(): Promise<PositionDto[]>;
  previewExecution(intent: ExecutionIntent): Promise<OrderDto>;
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
  getEligibility(accountId: string): Promise<EligibilityResult>;
  previewConversion(payload: ConversionPreviewDto): Promise<ConversionPreviewDto>;
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
  pay?: PayRuntimeHeaderOptions;
  payCompatibilityVersion?: string;
  payParityCheckMarker?: string;
}

export type CreatePayClientOptions = CreateApiClientOptions;
