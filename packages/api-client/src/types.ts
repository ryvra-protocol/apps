import type { AssetDto, ExecutionIntent, OrderDto, PositionDto } from "@ryvra/domain-markets";
import type { InvoiceDto, PayoutDto, SubscriptionDto } from "@ryvra/domain-payments";
import type { ConversionPreviewDto, EligibilityResult } from "@ryvra/domain-tokenomics";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequest {
  method: HttpMethod;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
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

export interface MarketsClient {
  listAssets(): Promise<AssetDto[]>;
  listPositions(): Promise<PositionDto[]>;
  previewExecution(intent: ExecutionIntent): Promise<OrderDto>;
}

export interface PayClient {
  listInvoices(): Promise<InvoiceDto[]>;
  listPayouts(): Promise<PayoutDto[]>;
  listSubscriptions(): Promise<SubscriptionDto[]>;
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

export type ApiClientMode = "mock" | "live";

export interface CreateApiClientOptions {
  mode?: ApiClientMode;
  baseUrl?: string;
  transport?: Transport;
}
