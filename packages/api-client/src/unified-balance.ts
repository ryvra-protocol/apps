import type { PositionDto } from "@ryvra/domain-markets";

const DEFAULT_MOCK_ACCOUNT_ID = "acct-core-1";
const NEAR_ZERO_THRESHOLD = 1e-9;

export interface UnifiedBalanceSourceRow {
  accountId: string;
  canonicalId: string;
  symbol: string;
  chainId: number;
  decimals: number;
  quantity: number;
  notionalValue: number;
  quoteAsset: string;
}

export interface UnifiedBalanceSource {
  source: string;
  precedence?: number;
  rows: UnifiedBalanceSourceRow[];
}

export interface UnifiedBalanceRow extends UnifiedBalanceSourceRow {
  id: string;
  source: string;
}

export interface UnifiedBalanceAggregation {
  totalNotionalValue: number;
  totalQuoteAsset: string;
  rows: UnifiedBalanceRow[];
  scopeMismatch: boolean;
  scopeMessage?: string;
  hasMixedQuoteAssets: boolean;
}

export interface UnifiedBalanceDisplayRow {
  id: string;
  assetSymbol: string;
  chainLabel: string;
  quantityLabel: string;
  valueLabel: string;
}

export interface UnifiedBalanceDisplayModel {
  totalLabel: string;
  rows: UnifiedBalanceDisplayRow[];
  scopeMessage?: string;
}

function normalizeText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function parseAmount(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

function normalizeNearZero(value: number, threshold = NEAR_ZERO_THRESHOLD): number {
  return Math.abs(value) < threshold ? 0 : value;
}

function formatNumber(value: number, maximumFractionDigits: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(normalizeNearZero(value));
}

function toRowKey(canonicalId: string, chainId: number): string {
  return `${canonicalId.toLowerCase()}::${chainId}`;
}

function createScopeMessage(expectedAccountId: string | undefined, accountIds: string[]): string | undefined {
  if (accountIds.length === 0) {
    return undefined;
  }

  if (!expectedAccountId) {
    return accountIds.length > 1
      ? `Assets are scoped to multiple accounts (${accountIds.join(", ")}). Configure a single account scope.`
      : undefined;
  }

  if (accountIds.length === 1 && accountIds[0] === expectedAccountId) {
    return undefined;
  }

  return `Expected account scope ${expectedAccountId}, but received assets for ${accountIds.join(", ")}.`;
}

export function resolveUnifiedBalanceAccountId(input: {
  configuredAccountId?: string;
  mode: "mock" | "http";
  mockFallbackAccountId?: string;
}): string | undefined {
  const configuredAccountId = normalizeText(input.configuredAccountId);
  if (configuredAccountId) {
    return configuredAccountId;
  }

  if (input.mode === "mock") {
    return normalizeText(input.mockFallbackAccountId) ?? DEFAULT_MOCK_ACCOUNT_ID;
  }

  return undefined;
}

export function mapPositionsToUnifiedBalanceRows(positions: PositionDto[]): UnifiedBalanceSourceRow[] {
  return positions.map((position) => ({
    accountId: position.accountId,
    canonicalId: position.asset.canonicalId,
    symbol: position.asset.symbol,
    chainId: position.asset.chainId,
    decimals: position.asset.decimals,
    quantity: parseAmount(position.quantity),
    notionalValue: parseAmount(position.notionalValue),
    quoteAsset: normalizeText(position.notionalQuoteAsset)?.toUpperCase() ?? "USD",
  }));
}

export function aggregateUnifiedBalance(input: {
  expectedAccountId?: string;
  sources: UnifiedBalanceSource[];
}): UnifiedBalanceAggregation {
  const sortedSources = input.sources
    .map((source, index) => ({
      ...source,
      precedence: source.precedence ?? index,
    }))
    .sort((left, right) => left.precedence - right.precedence || left.source.localeCompare(right.source));

  const deduplicated = new Map<
    string,
    {
      precedence: number;
      row: UnifiedBalanceRow;
    }
  >();

  for (const source of sortedSources) {
    for (const row of source.rows) {
      const id = toRowKey(row.canonicalId, row.chainId);
      const existing = deduplicated.get(id);

      if (!existing) {
        deduplicated.set(id, {
          precedence: source.precedence,
          row: {
            ...row,
            id,
            source: source.source,
            quantity: normalizeNearZero(row.quantity),
            notionalValue: normalizeNearZero(row.notionalValue),
          },
        });
        continue;
      }

      if (existing.precedence === source.precedence) {
        existing.row.quantity = normalizeNearZero(existing.row.quantity + row.quantity);
        existing.row.notionalValue = normalizeNearZero(existing.row.notionalValue + row.notionalValue);
      }
    }
  }

  const rows = [...deduplicated.values()]
    .map((entry) => entry.row)
    .sort(
      (left, right) =>
        right.notionalValue - left.notionalValue ||
        left.symbol.localeCompare(right.symbol) ||
        left.chainId - right.chainId,
    );

  const accountIds = [...new Set(rows.map((row) => row.accountId))].sort();
  const scopeMessage = createScopeMessage(input.expectedAccountId, accountIds);
  const scopeMismatch = Boolean(scopeMessage);

  const quoteAssets = [...new Set(rows.map((row) => row.quoteAsset))].sort();
  const hasMixedQuoteAssets = quoteAssets.length > 1;
  const totalQuoteAsset = quoteAssets[0] ?? "USD";
  const totalNotionalValue = normalizeNearZero(rows.reduce((sum, row) => sum + row.notionalValue, 0));

  return {
    totalNotionalValue,
    totalQuoteAsset: hasMixedQuoteAssets ? "MIXED" : totalQuoteAsset,
    rows,
    scopeMismatch,
    ...(scopeMessage ? { scopeMessage } : {}),
    hasMixedQuoteAssets,
  };
}

export function formatUnifiedBalanceValue(value: number, quoteAsset: string): string {
  return `${formatNumber(value, 2)} ${quoteAsset.toUpperCase()}`;
}

export function formatUnifiedBalanceQuantity(quantity: number, decimals: number): string {
  const maxFractionDigits = Math.min(8, Math.max(2, decimals));
  return formatNumber(quantity, maxFractionDigits);
}

export function formatUnifiedBalanceChain(chainId: number): string {
  return `Chain ${chainId}`;
}

export function createUnifiedBalanceDisplayModel(aggregation: UnifiedBalanceAggregation): UnifiedBalanceDisplayModel {
  return {
    totalLabel: formatUnifiedBalanceValue(aggregation.totalNotionalValue, aggregation.totalQuoteAsset),
    rows: aggregation.rows.map((row) => ({
      id: row.id,
      assetSymbol: row.symbol,
      chainLabel: formatUnifiedBalanceChain(row.chainId),
      quantityLabel: formatUnifiedBalanceQuantity(row.quantity, row.decimals),
      valueLabel: formatUnifiedBalanceValue(row.notionalValue, row.quoteAsset),
    })),
    ...(aggregation.scopeMessage ? { scopeMessage: aggregation.scopeMessage } : {}),
  };
}

export function createUnifiedBalanceDisplayModelFromPositions(input: {
  positions: PositionDto[];
  expectedAccountId?: string;
  source?: string;
}): UnifiedBalanceDisplayModel {
  return createUnifiedBalanceDisplayModel(
    aggregateUnifiedBalance({
      ...(typeof input.expectedAccountId === "string" ? { expectedAccountId: input.expectedAccountId } : {}),
      sources: [
        {
          source: input.source ?? "markets.positions",
          rows: mapPositionsToUnifiedBalanceRows(input.positions),
        },
      ],
    }),
  );
}
