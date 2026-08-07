export const invoiceStatuses = ["DRAFT", "PENDING", "PAID", "FAILED", "VOID"] as const;
export type InvoiceStatus = (typeof invoiceStatuses)[number];

export const payoutStatuses = ["SCHEDULED", "PROCESSING", "COMPLETED", "FAILED"] as const;
export type PayoutStatus = (typeof payoutStatuses)[number];

export const payoutDestinationTypes = ["BANK_ACCOUNT", "WALLET", "CARD"] as const;
export type PayoutDestinationType = (typeof payoutDestinationTypes)[number];

export const reconciliationStatuses = ["QUEUED", "RUNNING", "MATCHED", "MISMATCH", "FAILED"] as const;
export type ReconciliationStatus = (typeof reconciliationStatuses)[number];

export type ReconciliationEntityType = "INVOICE" | "PAYOUT";

export type SortDirection = "asc" | "desc";

export interface PayDateRangeFilter {
  from?: string;
  to?: string;
}

export interface PayPaginationRequest {
  page: number;
  pageSize: number;
}

export interface PaySortRequest {
  field: string;
  direction: SortDirection;
}

export interface PayPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PayListRequest<TFilters extends object> {
  filters?: TFilters;
  pagination?: PayPaginationRequest;
  sort?: PaySortRequest;
}

export interface PayListResponse<TItem> {
  items: TItem[];
  pagination: PayPaginationMeta;
}

export interface InvoiceFilters {
  status?: InvoiceStatus;
  search?: string;
  dateRange?: PayDateRangeFilter;
}

export interface PayoutFilters {
  status?: PayoutStatus;
  destinationType?: PayoutDestinationType;
  dateRange?: PayDateRangeFilter;
}

export interface ReconciliationFilters {
  status?: ReconciliationStatus;
  dateRange?: PayDateRangeFilter;
  exceptionOnly?: boolean;
}

export interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  customerName: string;
  amountMinor: number;
  currency: string;
  status: InvoiceStatus;
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
  failedAt?: string;
  description?: string;
}

export interface InvoiceSummaryDto {
  totalCount: number;
  paidCount: number;
  pendingCount: number;
  failedCount: number;
  totalAmountMinor: number;
  currency: string;
}

export interface PayoutDto {
  id: string;
  amountMinor: number;
  currency: string;
  status: PayoutStatus;
  destinationType: PayoutDestinationType;
  destinationLabel: string;
  createdAt: string;
  scheduledFor?: string;
  completedAt?: string;
  failureReason?: string;
}

export interface PayoutSummaryDto {
  scheduledCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  totalAmountMinor: number;
  currency: string;
}

export interface ReconciliationItemDto {
  id: string;
  runId: string;
  entityType: ReconciliationEntityType;
  entityId: string;
  status: ReconciliationStatus;
  expectedAmountMinor: number;
  actualAmountMinor: number;
  deltaMinor: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  exceptionCode?: string;
  exceptionMessage?: string;
}

export interface ReconciliationSummaryDto {
  runCount: number;
  matchedCount: number;
  mismatchCount: number;
  failedCount: number;
  exceptionCount: number;
  lastRunStatus: ReconciliationStatus;
  lastRunAt: string;
}

export interface PayOverviewMetricsDto {
  openInvoiceCount: number;
  pendingInvoiceAmountMinor: number;
  payoutInFlightCount: number;
  payoutProcessingAmountMinor: number;
  reconciliationMismatchCount: number;
  currency: string;
}

export interface PayActivityItemDto {
  id: string;
  type: "invoice" | "payout" | "reconciliation";
  title: string;
  status: InvoiceStatus | PayoutStatus | ReconciliationStatus;
  createdAt: string;
  amountMinor?: number;
  currency?: string;
}

export interface PayOverviewDto {
  metrics: PayOverviewMetricsDto;
  recentActivity: PayActivityItemDto[];
}

export interface SubscriptionDto {
  id: string;
  customerId: string;
  status: "ACTIVE" | "PAST_DUE" | "CANCELED";
  renewalAt: string;
}

export const paymentKinds = ["payout", "collection", "treasury_transfer"] as const;
export type PaymentKind = (typeof paymentKinds)[number];

export const paymentExecutionModes = ["legacy", "erc4337"] as const;
export type PaymentExecutionMode = (typeof paymentExecutionModes)[number];

export const sponsorshipModes = ["none", "paymaster"] as const;
export type SponsorshipMode = (typeof sponsorshipModes)[number];

export const paymentIntentStates = ["created", "authorized", "executing", "settled", "failed", "reversed"] as const;
export type PaymentIntentState = (typeof paymentIntentStates)[number];

export const policyDecisionOutcomes = ["ALLOW", "DENY"] as const;
export type PolicyDecisionOutcome = (typeof policyDecisionOutcomes)[number];

export interface UnifiedAssetReference {
  chain: string;
  asset: string;
  decimals: number;
}

export interface PaymentExecution {
  mode: PaymentExecutionMode;
  smart_account_id?: string;
  entry_point?: string;
  sponsorship_mode?: SponsorshipMode;
  sponsor_account_id?: string;
  sponsor_chain?: string;
  sponsor_asset?: string;
  allow_legacy_fallback?: boolean;
}

export interface PaymentIntent {
  intent_id: string;
  reference_id: string;
  idempotency_key: string;
  kind: PaymentKind;
  sourceAccountId: string;
  destinationAccountId: string;
  asset: UnifiedAssetReference;
  assetId: string;
  amount: string;
  reason_code: string;
  reason_codes?: string[];
  user_op_hash?: string;
  execution?: PaymentExecution;
  metadata?: Record<string, string>;
  state: PaymentIntentState;
  created_at: string;
}

export interface PolicyDecision {
  decision: PolicyDecisionOutcome;
  reason_codes: string[];
  evidence_ref?: string;
}

export interface CanonicalEventEnvelope<TPayload = unknown> {
  event_id: string;
  correlation_id: string;
  reference_id: string;
  event_type: string;
  timestamp: string;
  payload: TPayload;
}

export interface PaymentTransitionPayload {
  intent_id: string;
  from_state: PaymentIntentState;
  to_state: PaymentIntentState;
  reason_code: string;
  reason_codes: string[];
  ledger_event_id?: string;
  user_op_hash?: string;
}

export interface PaymentFailurePayload extends PaymentTransitionPayload {
  failure_category: "policy" | "execution" | "settlement" | "reversal";
}

export type PaymentEvent = CanonicalEventEnvelope<PaymentTransitionPayload>;

export type PaymentFailureEvent = CanonicalEventEnvelope<PaymentFailurePayload>;

export interface SettlementSnapshot {
  reference_id: string;
  state: "pending" | "settled" | "failed";
  amount: string;
  asset: UnifiedAssetReference;
  observed_at: string;
}

export interface ReconciliationResult {
  status: "matched" | "mismatch" | "pending";
  reason_code: string;
}

export interface UnifiedAssetBoundaryInput {
  asset?: Partial<UnifiedAssetReference>;
  /** @deprecated Use asset.chain instead. */
  chain?: string;
  /** @deprecated Use asset.chain instead. */
  chainId?: string;
  /** @deprecated Use asset.chain instead. */
  chain_id?: string;
  /** @deprecated Use asset.asset instead. */
  assetId?: string;
  /** @deprecated Use asset.asset instead. */
  asset_id?: string;
  /** @deprecated Use asset.decimals instead. */
  decimals?: number;
  /** @deprecated Use asset.decimals instead. */
  assetDecimals?: number;
  /** @deprecated Use asset.decimals instead. */
  asset_decimals?: number;
}

export interface AccountAbstractionBoundaryInput {
  execution?: Partial<PaymentExecution>;
  execution_mode?: PaymentExecutionMode;
  executionMode?: PaymentExecutionMode;
  allow_legacy_fallback?: boolean;
  allowLegacyFallback?: boolean;
  smart_account_id?: string;
  smartAccountId?: string;
  entry_point?: string;
  entryPoint?: string;
  sponsorship_mode?: SponsorshipMode;
  sponsorshipMode?: SponsorshipMode;
  sponsor_account_id?: string;
  sponsorAccountId?: string;
  sponsor_chain?: string;
  sponsorChain?: string;
  sponsor_asset?: string;
  sponsorAsset?: string;
  user_op_hash?: string;
  userOpHash?: string;
}

export interface PaymentIntentBoundaryInput
  extends Omit<PaymentIntent, "asset" | "assetId" | "execution" | "user_op_hash">,
    UnifiedAssetBoundaryInput,
    AccountAbstractionBoundaryInput {}

export interface IdempotencyKeyInput {
  scope: string;
  reference: string;
  nonce?: string;
}

export const payProtocolVersion = "rfc-0006-v1-draft" as const;
export const payProtocolSourceRepo = "ryvra-protocol/pay" as const;

export function createIdempotencyKey(input: IdempotencyKeyInput): string {
  return [input.scope, input.reference, input.nonce ?? "default"].join(":");
}
