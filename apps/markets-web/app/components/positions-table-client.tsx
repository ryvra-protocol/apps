"use client";

import {
  marketPositionRiskStates,
  marketPositionSides,
  type MarketsPaginationMeta,
  type PositionDto,
} from "@ryvra/domain-markets";
import { Button, Card, DataTable, themeTokens } from "@ryvra/ui";
import { useMemo } from "react";
import { formatDateTime, formatSigned } from "../lib/format";
import { StatusBadge } from "./status-badge";
import { useQueryFilters } from "./use-query-filters";

interface PositionsTableClientProps {
  items: PositionDto[];
  pagination: MarketsPaginationMeta;
}

const riskStateOptions = ["ALL", ...marketPositionRiskStates] as const;
const sideOptions = ["ALL", ...marketPositionSides] as const;
const sortFieldOptions = [
  { value: "updatedAt", label: "Updated time" },
  { value: "symbol", label: "Symbol" },
  { value: "riskState", label: "Risk state" },
  { value: "side", label: "Position side" },
] as const;

export function PositionsTableClient({ items, pagination }: PositionsTableClientProps) {
  const { searchParams, updateQuery, clearQuery } = useQueryFilters();

  const riskStateParam = (searchParams.get("riskState") ?? "ALL").toLowerCase();
  const sideParam = (searchParams.get("side") ?? "ALL").toLowerCase();
  const symbol = searchParams.get("symbol") ?? "";
  const search = searchParams.get("search") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const sortField = searchParams.get("sortField") ?? "updatedAt";
  const sortDirection = searchParams.get("sortDirection") === "asc" ? "asc" : "desc";

  const riskState = riskStateOptions.includes(riskStateParam as (typeof riskStateOptions)[number]) ? riskStateParam : "ALL";
  const side = sideOptions.includes(sideParam as (typeof sideOptions)[number]) ? sideParam : "ALL";
  const hasFilters =
    riskState !== "ALL" ||
    side !== "ALL" ||
    symbol.length > 0 ||
    search.length > 0 ||
    from.length > 0 ||
    to.length > 0 ||
    sortField !== "updatedAt" ||
    sortDirection !== "desc";

  const visibleRows = useMemo(() => [...items], [items]);
  const canGoPrev = pagination.page > 1;
  const canGoNext = pagination.page < pagination.totalPages;

  return (
    <section aria-labelledby="positions-table-title" style={{ display: "grid", gap: themeTokens.spacing.md }}>
      <style>{`
        .markets-filter-control {
          border: 1px solid ${themeTokens.color.borderStrong};
          border-radius: ${themeTokens.radius.md};
          padding: ${themeTokens.spacing.sm};
          font-size: ${themeTokens.typography.size.sm};
          color: ${themeTokens.color.text};
          background: ${themeTokens.color.surface};
        }

        .markets-filter-control:focus-visible {
          outline: ${themeTokens.focusRing.width} solid ${themeTokens.color.focusRing};
          outline-offset: ${themeTokens.focusRing.offset};
        }
      `}</style>

      <h3 id="positions-table-title" style={{ margin: 0, fontSize: themeTokens.typography.size.lg }}>
        Position inventory
      </h3>

      <Card>
        <form
          aria-label="Position filters"
          onSubmit={(event) => event.preventDefault()}
          style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
        >
          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Symbol</span>
            <input
              className="markets-filter-control"
              type="search"
              value={symbol}
              onChange={(event) => updateQuery({ symbol: event.currentTarget.value || undefined })}
              placeholder="BTC-USD"
            />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Search</span>
            <input
              className="markets-filter-control"
              type="search"
              value={search}
              onChange={(event) => updateQuery({ search: event.currentTarget.value || undefined })}
              placeholder="Position id, account, asset"
            />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Risk state</span>
            <select
              className="markets-filter-control"
              value={riskState}
              onChange={(event) => updateQuery({ riskState: event.currentTarget.value === "ALL" ? undefined : event.currentTarget.value })}
            >
              {riskStateOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Side</span>
            <select className="markets-filter-control" value={side} onChange={(event) => updateQuery({ side: event.currentTarget.value === "ALL" ? undefined : event.currentTarget.value })}>
              {sideOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>From date</span>
            <input className="markets-filter-control" type="date" value={from} onChange={(event) => updateQuery({ from: event.currentTarget.value || undefined })} />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>To date</span>
            <input className="markets-filter-control" type="date" value={to} onChange={(event) => updateQuery({ to: event.currentTarget.value || undefined })} />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Sort by</span>
            <select className="markets-filter-control" value={sortField} onChange={(event) => updateQuery({ sortField: event.currentTarget.value })}>
              {sortFieldOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Direction</span>
            <select className="markets-filter-control" value={sortDirection} onChange={(event) => updateQuery({ sortDirection: event.currentTarget.value })}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => clearQuery(["symbol", "search", "riskState", "side", "from", "to", "sortField", "sortDirection", "page"])}
              disabled={!hasFilters}
              aria-describedby={!hasFilters ? "positions-reset-hint" : undefined}
            >
              Reset filters
            </Button>
          </div>
        </form>
        {!hasFilters ? (
          <p id="positions-reset-hint" style={{ marginBottom: 0, color: themeTokens.color.textMuted }}>
            Reset is disabled because no filters are currently applied.
          </p>
        ) : null}
      </Card>

      <DataTable<PositionDto>
        caption="Positions"
        columns={[
          { key: "symbol", header: "Asset / Symbol" },
          {
            key: "quantity",
            header: "Size",
            render: (value, row) => `${value} (${row.side})`,
          },
          {
            key: "entryPrice",
            header: "Entry / Mark",
            render: (value, row) => `${value ?? "n/a"} / ${row.markPrice ?? "n/a"}`,
          },
          {
            key: "unrealizedPnl",
            header: "PnL",
            render: (value) => formatSigned(typeof value === "string" ? value : undefined),
          },
          {
            key: "riskState",
            header: "Risk state",
            render: (value) => <StatusBadge status={String(value)} />,
          },
          {
            key: "updatedAt",
            header: "Timestamp",
            render: (value) => formatDateTime(String(value)),
          },
        ]}
        rows={visibleRows}
        getRowKey={(row) => row.id}
        emptyMessage="No positions match the selected filters."
      />

      {visibleRows.length === 0 ? (
        <Card title="No positions found">
          <p style={{ marginTop: 0 }}>Try clearing symbol/risk filters or widening the date range.</p>
          <Button type="button" variant="secondary" onClick={() => clearQuery(["symbol", "search", "riskState", "side", "from", "to", "page"])}>
            Clear filters
          </Button>
        </Card>
      ) : null}

      <div aria-label="Position pagination" style={{ display: "flex", alignItems: "center", gap: themeTokens.spacing.md, flexWrap: "wrap" }}>
        <span style={{ color: themeTokens.color.textMuted }}>
          Page {pagination.page} of {pagination.totalPages} • {pagination.total} total positions
        </span>
        {canGoPrev ? (
          <Button type="button" variant="secondary" onClick={() => updateQuery({ page: String(pagination.page - 1) }, { resetPage: false })}>
            Previous
          </Button>
        ) : (
          <span style={{ color: themeTokens.color.textMuted }}>Previous page unavailable on first page.</span>
        )}
        {canGoNext ? (
          <Button type="button" variant="secondary" onClick={() => updateQuery({ page: String(pagination.page + 1) }, { resetPage: false })}>
            Next
          </Button>
        ) : (
          <span style={{ color: themeTokens.color.textMuted }}>No further pages available.</span>
        )}
      </div>
    </section>
  );
}
