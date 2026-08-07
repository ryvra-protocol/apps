import type {
  InvoiceDto,
  InvoiceSummaryDto,
  PayListResponse,
  PayOverviewDto,
  PaymentIntent,
  PayoutDto,
  PayoutSummaryDto,
  ReconciliationItemDto,
  ReconciliationResult,
  ReconciliationSummaryDto,
  SettlementSnapshot,
  SubscriptionDto,
} from "@ryvra/domain-payments";
import { isPaymentIntentState } from "./pay-parity";

type PaymentExecution = NonNullable<PaymentIntent["execution"]>;
const invoiceStatuses = ["DRAFT", "PENDING", "PAID", "FAILED", "VOID"] as const;
const payoutStatuses = ["SCHEDULED", "PROCESSING", "COMPLETED", "FAILED"] as const;
const payoutDestinationTypes = ["BANK_ACCOUNT", "WALLET", "CARD"] as const;
const reconciliationStatuses = ["QUEUED", "RUNNING", "MATCHED", "MISMATCH", "FAILED"] as const;

function ensureObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }

  return value as Record<string, unknown>;
}

function ensureString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }

  return value;
}

function ensureNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${label} must be a number`);
  }

  return value;
}

function optionalString(value: unknown, label: string): string | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }

  return ensureString(value, label);
}

function optionalBoolean(value: unknown, label: string): boolean | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean`);
  }

  return value;
}

function ensureStringRecord(value: unknown, label: string): Record<string, string> | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }

  const candidate = ensureObject(value, label);
  const entries = Object.entries(candidate).map(([key, entryValue]) => [key, ensureString(entryValue, `${label}.${key}`)] as const);
  return Object.fromEntries(entries);
}

function ensureArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }

  return value;
}

function parsePagination(value: unknown): PayListResponse<unknown>["pagination"] {
  const pagination = ensureObject(value, "pagination");

  return {
    page: ensureNumber(pagination.page, "pagination.page"),
    pageSize: ensureNumber(pagination.pageSize, "pagination.pageSize"),
    total: ensureNumber(pagination.total, "pagination.total"),
    totalPages: ensureNumber(pagination.totalPages, "pagination.totalPages"),
  };
}

function decodeListResponse<TItem>(value: unknown, decodeItem: (entry: unknown) => TItem): PayListResponse<TItem> {
  const payload = ensureObject(value, "pay list response");

  return {
    items: ensureArray(payload.items, "items").map((entry) => decodeItem(entry)),
    pagination: parsePagination(payload.pagination),
  };
}

const invoiceStatusSet = new Set(invoiceStatuses);
const payoutStatusSet = new Set(payoutStatuses);
const payoutDestinationTypeSet = new Set(payoutDestinationTypes);
const reconciliationStatusSet = new Set(reconciliationStatuses);

function assertEnum(value: string, enumSet: ReadonlySet<string>, label: string): string {
  if (!enumSet.has(value)) {
    throw new Error(`${label} has unsupported enum value: ${value}`);
  }

  return value;
}

function decodeInvoice(value: unknown): InvoiceDto {
  const payload = ensureObject(value, "invoice");
  const paidAt = optionalString(payload.paidAt, "invoice.paidAt");
  const failedAt = optionalString(payload.failedAt, "invoice.failedAt");
  const description = optionalString(payload.description, "invoice.description");

  return {
    id: ensureString(payload.id, "invoice.id"),
    invoiceNumber: ensureString(payload.invoiceNumber, "invoice.invoiceNumber"),
    customerName: ensureString(payload.customerName, "invoice.customerName"),
    amountMinor: ensureNumber(payload.amountMinor, "invoice.amountMinor"),
    currency: ensureString(payload.currency, "invoice.currency"),
    status: assertEnum(ensureString(payload.status, "invoice.status"), invoiceStatusSet, "invoice.status") as InvoiceDto["status"],
    issuedAt: ensureString(payload.issuedAt, "invoice.issuedAt"),
    dueAt: ensureString(payload.dueAt, "invoice.dueAt"),
    ...(paidAt ? { paidAt } : {}),
    ...(failedAt ? { failedAt } : {}),
    ...(description ? { description } : {}),
  };
}

function decodePayout(value: unknown): PayoutDto {
  const payload = ensureObject(value, "payout");
  const scheduledFor = optionalString(payload.scheduledFor, "payout.scheduledFor");
  const completedAt = optionalString(payload.completedAt, "payout.completedAt");
  const failureReason = optionalString(payload.failureReason, "payout.failureReason");

  return {
    id: ensureString(payload.id, "payout.id"),
    amountMinor: ensureNumber(payload.amountMinor, "payout.amountMinor"),
    currency: ensureString(payload.currency, "payout.currency"),
    status: assertEnum(ensureString(payload.status, "payout.status"), payoutStatusSet, "payout.status") as PayoutDto["status"],
    destinationType: assertEnum(
      ensureString(payload.destinationType, "payout.destinationType"),
      payoutDestinationTypeSet,
      "payout.destinationType",
    ) as PayoutDto["destinationType"],
    destinationLabel: ensureString(payload.destinationLabel, "payout.destinationLabel"),
    createdAt: ensureString(payload.createdAt, "payout.createdAt"),
    ...(scheduledFor ? { scheduledFor } : {}),
    ...(completedAt ? { completedAt } : {}),
    ...(failureReason ? { failureReason } : {}),
  };
}

function decodeReconciliationItem(value: unknown): ReconciliationItemDto {
  const payload = ensureObject(value, "reconciliation item");
  const exceptionCode = optionalString(payload.exceptionCode, "reconciliation.exceptionCode");
  const exceptionMessage = optionalString(payload.exceptionMessage, "reconciliation.exceptionMessage");

  return {
    id: ensureString(payload.id, "reconciliation.id"),
    runId: ensureString(payload.runId, "reconciliation.runId"),
    entityType: ensureString(payload.entityType, "reconciliation.entityType") as ReconciliationItemDto["entityType"],
    entityId: ensureString(payload.entityId, "reconciliation.entityId"),
    status: assertEnum(
      ensureString(payload.status, "reconciliation.status"),
      reconciliationStatusSet,
      "reconciliation.status",
    ) as ReconciliationItemDto["status"],
    expectedAmountMinor: ensureNumber(payload.expectedAmountMinor, "reconciliation.expectedAmountMinor"),
    actualAmountMinor: ensureNumber(payload.actualAmountMinor, "reconciliation.actualAmountMinor"),
    deltaMinor: ensureNumber(payload.deltaMinor, "reconciliation.deltaMinor"),
    currency: ensureString(payload.currency, "reconciliation.currency"),
    createdAt: ensureString(payload.createdAt, "reconciliation.createdAt"),
    updatedAt: ensureString(payload.updatedAt, "reconciliation.updatedAt"),
    ...(exceptionCode ? { exceptionCode } : {}),
    ...(exceptionMessage ? { exceptionMessage } : {}),
  };
}

export function decodeInvoiceList(value: unknown): PayListResponse<InvoiceDto> {
  return decodeListResponse(value, decodeInvoice);
}

export function decodePayoutList(value: unknown): PayListResponse<PayoutDto> {
  return decodeListResponse(value, decodePayout);
}

export function decodeReconciliationList(value: unknown): PayListResponse<ReconciliationItemDto> {
  return decodeListResponse(value, decodeReconciliationItem);
}

export function decodeInvoiceSummary(value: unknown): InvoiceSummaryDto {
  const payload = ensureObject(value, "invoice summary");
  return {
    totalCount: ensureNumber(payload.totalCount, "invoiceSummary.totalCount"),
    paidCount: ensureNumber(payload.paidCount, "invoiceSummary.paidCount"),
    pendingCount: ensureNumber(payload.pendingCount, "invoiceSummary.pendingCount"),
    failedCount: ensureNumber(payload.failedCount, "invoiceSummary.failedCount"),
    totalAmountMinor: ensureNumber(payload.totalAmountMinor, "invoiceSummary.totalAmountMinor"),
    currency: ensureString(payload.currency, "invoiceSummary.currency"),
  };
}

export function decodePayoutSummary(value: unknown): PayoutSummaryDto {
  const payload = ensureObject(value, "payout summary");
  return {
    scheduledCount: ensureNumber(payload.scheduledCount, "payoutSummary.scheduledCount"),
    processingCount: ensureNumber(payload.processingCount, "payoutSummary.processingCount"),
    completedCount: ensureNumber(payload.completedCount, "payoutSummary.completedCount"),
    failedCount: ensureNumber(payload.failedCount, "payoutSummary.failedCount"),
    totalAmountMinor: ensureNumber(payload.totalAmountMinor, "payoutSummary.totalAmountMinor"),
    currency: ensureString(payload.currency, "payoutSummary.currency"),
  };
}

export function decodeReconciliationSummary(value: unknown): ReconciliationSummaryDto {
  const payload = ensureObject(value, "reconciliation summary");
  return {
    runCount: ensureNumber(payload.runCount, "reconciliationSummary.runCount"),
    matchedCount: ensureNumber(payload.matchedCount, "reconciliationSummary.matchedCount"),
    mismatchCount: ensureNumber(payload.mismatchCount, "reconciliationSummary.mismatchCount"),
    failedCount: ensureNumber(payload.failedCount, "reconciliationSummary.failedCount"),
    exceptionCount: ensureNumber(payload.exceptionCount, "reconciliationSummary.exceptionCount"),
    lastRunStatus: assertEnum(
      ensureString(payload.lastRunStatus, "reconciliationSummary.lastRunStatus"),
      reconciliationStatusSet,
      "reconciliationSummary.lastRunStatus",
    ) as ReconciliationSummaryDto["lastRunStatus"],
    lastRunAt: ensureString(payload.lastRunAt, "reconciliationSummary.lastRunAt"),
  };
}

export function decodePayOverview(value: unknown): PayOverviewDto {
  const payload = ensureObject(value, "pay overview");
  const metrics = ensureObject(payload.metrics, "overview.metrics");
  const recentActivity = ensureArray(payload.recentActivity, "overview.recentActivity");

  return {
    metrics: {
      openInvoiceCount: ensureNumber(metrics.openInvoiceCount, "overview.metrics.openInvoiceCount"),
      pendingInvoiceAmountMinor: ensureNumber(
        metrics.pendingInvoiceAmountMinor,
        "overview.metrics.pendingInvoiceAmountMinor",
      ),
      payoutInFlightCount: ensureNumber(metrics.payoutInFlightCount, "overview.metrics.payoutInFlightCount"),
      payoutProcessingAmountMinor: ensureNumber(
        metrics.payoutProcessingAmountMinor,
        "overview.metrics.payoutProcessingAmountMinor",
      ),
      reconciliationMismatchCount: ensureNumber(
        metrics.reconciliationMismatchCount,
        "overview.metrics.reconciliationMismatchCount",
      ),
      currency: ensureString(metrics.currency, "overview.metrics.currency"),
    },
    recentActivity: recentActivity.map((entry, index) => {
      const activity = ensureObject(entry, `overview.recentActivity[${index}]`);
      const amountMinor =
        typeof activity.amountMinor === "undefined"
          ? undefined
          : ensureNumber(activity.amountMinor, `overview.recentActivity[${index}].amountMinor`);
      const currency = optionalString(activity.currency, `overview.recentActivity[${index}].currency`);
      return {
        id: ensureString(activity.id, `overview.recentActivity[${index}].id`),
        type: ensureString(activity.type, `overview.recentActivity[${index}].type`) as PayOverviewDto["recentActivity"][number]["type"],
        title: ensureString(activity.title, `overview.recentActivity[${index}].title`),
        status: ensureString(activity.status, `overview.recentActivity[${index}].status`) as PayOverviewDto["recentActivity"][number]["status"],
        createdAt: ensureString(activity.createdAt, `overview.recentActivity[${index}].createdAt`),
        ...(typeof amountMinor === "number" ? { amountMinor } : {}),
        ...(currency ? { currency } : {}),
      };
    }),
  };
}

export function decodeSubscriptions(value: unknown): SubscriptionDto[] {
  return ensureArray(value, "subscriptions").map((entry, index) => {
    const subscription = ensureObject(entry, `subscriptions[${index}]`);
    return {
      id: ensureString(subscription.id, `subscriptions[${index}].id`),
      customerId: ensureString(subscription.customerId, `subscriptions[${index}].customerId`),
      status: ensureString(subscription.status, `subscriptions[${index}].status`) as SubscriptionDto["status"],
      renewalAt: ensureString(subscription.renewalAt, `subscriptions[${index}].renewalAt`),
    };
  });
}

function decodeUnifiedAssetReference(value: unknown, label: string): PaymentIntent["asset"] {
  const asset = ensureObject(value, label);
  return {
    chain: ensureString(asset.chain, `${label}.chain`),
    asset: ensureString(asset.asset, `${label}.asset`),
    decimals: ensureNumber(asset.decimals, `${label}.decimals`),
  };
}

function decodePaymentExecution(value: unknown, label: string): PaymentIntent["execution"] {
  if (typeof value === "undefined") {
    return undefined;
  }

  const execution = ensureObject(value, label);
  const smartAccountId = optionalString(execution.smart_account_id, `${label}.smart_account_id`);
  const entryPoint = optionalString(execution.entry_point, `${label}.entry_point`);
  const sponsorshipMode = optionalString(execution.sponsorship_mode, `${label}.sponsorship_mode`) as
    | PaymentExecution["sponsorship_mode"]
    | undefined;
  const sponsorAccountId = optionalString(execution.sponsor_account_id, `${label}.sponsor_account_id`);
  const sponsorChain = optionalString(execution.sponsor_chain, `${label}.sponsor_chain`);
  const sponsorAsset = optionalString(execution.sponsor_asset, `${label}.sponsor_asset`);
  const allowLegacyFallback = optionalBoolean(execution.allow_legacy_fallback, `${label}.allow_legacy_fallback`);

  return {
    mode: ensureString(execution.mode, `${label}.mode`) as PaymentExecution["mode"],
    ...(smartAccountId ? { smart_account_id: smartAccountId } : {}),
    ...(entryPoint ? { entry_point: entryPoint } : {}),
    ...(sponsorshipMode ? { sponsorship_mode: sponsorshipMode } : {}),
    ...(sponsorAccountId ? { sponsor_account_id: sponsorAccountId } : {}),
    ...(sponsorChain ? { sponsor_chain: sponsorChain } : {}),
    ...(sponsorAsset ? { sponsor_asset: sponsorAsset } : {}),
    ...(typeof allowLegacyFallback === "boolean" ? { allow_legacy_fallback: allowLegacyFallback } : {}),
  };
}

export function decodePaymentIntent(value: unknown): PaymentIntent {
  const payload = ensureObject(value, "payment intent");
  const state = ensureString(payload.state, "paymentIntent.state");
  if (!isPaymentIntentState(state)) {
    throw new Error(`paymentIntent.state has unsupported enum value: ${state}`);
  }

  const reasonCodes = payload.reason_codes;
  const parsedReasonCodes =
    typeof reasonCodes === "undefined"
      ? undefined
      : ensureArray(reasonCodes, "paymentIntent.reason_codes").map((entry, index) =>
          ensureString(entry, `paymentIntent.reason_codes[${index}]`),
        );
  const userOpHash = optionalString(payload.user_op_hash, "paymentIntent.user_op_hash");
  const execution = decodePaymentExecution(payload.execution, "paymentIntent.execution");
  const metadata = ensureStringRecord(payload.metadata, "paymentIntent.metadata");

  return {
    intent_id: ensureString(payload.intent_id, "paymentIntent.intent_id"),
    reference_id: ensureString(payload.reference_id, "paymentIntent.reference_id"),
    idempotency_key: ensureString(payload.idempotency_key, "paymentIntent.idempotency_key"),
    kind: ensureString(payload.kind, "paymentIntent.kind") as PaymentIntent["kind"],
    sourceAccountId: ensureString(payload.sourceAccountId, "paymentIntent.sourceAccountId"),
    destinationAccountId: ensureString(payload.destinationAccountId, "paymentIntent.destinationAccountId"),
    asset: decodeUnifiedAssetReference(payload.asset, "paymentIntent.asset"),
    assetId: ensureString(payload.assetId, "paymentIntent.assetId"),
    amount: ensureString(payload.amount, "paymentIntent.amount"),
    reason_code: ensureString(payload.reason_code, "paymentIntent.reason_code"),
    ...(parsedReasonCodes ? { reason_codes: parsedReasonCodes } : {}),
    ...(userOpHash ? { user_op_hash: userOpHash } : {}),
    ...(execution ? { execution } : {}),
    ...(metadata ? { metadata } : {}),
    state,
    created_at: ensureString(payload.created_at, "paymentIntent.created_at"),
  };
}

export function decodeSettlementSnapshot(value: unknown): SettlementSnapshot {
  const payload = ensureObject(value, "settlement snapshot");
  return {
    reference_id: ensureString(payload.reference_id, "settlement.reference_id"),
    state: ensureString(payload.state, "settlement.state") as SettlementSnapshot["state"],
    amount: ensureString(payload.amount, "settlement.amount"),
    asset: decodeUnifiedAssetReference(payload.asset, "settlement.asset"),
    observed_at: ensureString(payload.observed_at, "settlement.observed_at"),
  };
}

export function decodeReconciliationResult(value: unknown): ReconciliationResult {
  const payload = ensureObject(value, "reconciliation result");
  return {
    status: ensureString(payload.status, "reconciliation.status") as ReconciliationResult["status"],
    reason_code: ensureString(payload.reason_code, "reconciliation.reason_code"),
  };
}
