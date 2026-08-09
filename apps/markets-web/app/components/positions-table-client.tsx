"use client";

import {
  marketInstrumentClasses,
  marketPositionSides,
  marketPositionStates,
  type MarketsPaginationMeta,
  type PositionDto,
} from "@ryvra/domain-markets";
import { Button, Card, DataTable, themeTokens } from "@ryvra/ui";
import { useDeferredValue } from "react";
import { formatDateTime } from "../lib/format";
import { StatusBadge } from "./status-badge";
import { useQueryFilters } from "./use-query-filters";

interface PositionsTableClientProps {
  items: PositionDto[];
  pagination: MarketsPaginationMeta;
}

const stateOptions = ["ALL", ...marketPositionStates] as const;
const sideOptions = ["ALL", ...marketPositionSides] as const;
const classOptions = ["ALL", ...marketInstrumentClasses] as const;
const sortFieldOptions = [
  { value: "updated_at", label: "Updated time" },
  { value: "notional_value", label: "Notional value" },
  { value: "quantity", label: "Quantity" },
] as const;

export function PositionsTableClient({ items, pagination }: PositionsTableClientProps) {
  const { searchParams, updateQuery, clearQuery } = useQueryFilters();

  const stateParam = (searchParams.get("state") ?? searchParams.get("riskState") ?? "ALL").toLowerCase();
  const sideParam = (searchParams.get("side") ?? "ALL").toLowerCase();
  const classParam = (searchParams.get("assetClass") ?? "ALL").toLowerCase();
  const riskFlag = searchParams.get("riskFlag") ?? searchParams.get("risk_flag") ?? "";
  const sortField = searchParams.get("sortBy") ?? "updated_at";
  const sortDirection = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const state = stateOptions.includes(stateParam as (typeof stateOptions)[number]) ? stateParam : "ALL";
  const side = sideOptions.includes(sideParam as (typeof sideOptions)[number]) ? sideParam : "ALL";
  const assetClass = classOptions.includes(classParam as (typeof classOptions)[number]) ? classParam : "ALL";
  const hasFilters =
    state !== "ALL" ||
    side !== "ALL" ||
    assetClass !== "ALL" ||
    riskFlag.length > 0 ||
    sortField !== "updated_at" ||
    sortDirection !== "desc";

  const deferredItems = useDeferredValue(items);
  const visibleRows = deferredItems;
  const rowsPending = deferredItems !== items;

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
            <span>Asset class</span>
            <select
              className="markets-filter-control"
              value={assetClass}
              onChange={(event) => updateQuery({ assetClass: event.currentTarget.value === "ALL" ? undefined : event.currentTarget.value })}
            >
              {classOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>State</span>
            <select
              className="markets-filter-control"
              value={state}
              onChange={(event) => updateQuery({ state: event.currentTarget.value === "ALL" ? undefined : event.currentTarget.value })}
            >
              {stateOptions.map((option) => (
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
            <span>Risk flags (comma-separated)</span>
            <input
              className="markets-filter-control"
              type="text"
              value={riskFlag}
              onChange={(event) => updateQuery({ riskFlag: event.currentTarget.value || undefined })}
              placeholder="concentration_limit_near"
            />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Sort by</span>
            <select className="markets-filter-control" value={sortField} onChange={(event) => updateQuery({ sortBy: event.currentTarget.value })}>
              {sortFieldOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Order</span>
            <select className="markets-filter-control" value={sortDirection} onChange={(event) => updateQuery({ sortOrder: event.currentTarget.value })}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => clearQuery(["assetClass", "state", "riskState", "side", "riskFlag", "risk_flag", "sortBy", "sortOrder", "cursor", "page"])}
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
          { key: "id", header: "Position id" },
          {
            key: "asset",
            header: "Asset",
            render: (_, row) => `${row.asset.symbol} (${row.asset.canonicalId})`,
          },
          {
            key: "state",
            header: "State",
            render: (value) => <StatusBadge status={String(value)} />,
          },
          {
            key: "side",
            header: "Side",
            render: (value) => <StatusBadge status={String(value)} />,
          },
          { key: "quantity", header: "Qty" },
          { key: "notionalValue", header: "Notional" },
          { key: "netExposureBand", header: "Exposure band" },
          {
            key: "riskFlags",
            header: "Risk flags",
            render: (value) => {
              const flags = Array.isArray(value) ? value : [];
              return flags.length > 0 ? flags.join(", ") : "none";
            },
          },
          {
            key: "updatedAt",
            header: "Updated",
            render: (value) => formatDateTime(String(value)),
          },
        ]}
        rows={visibleRows}
        getRowKey={(row) => row.id}
        emptyMessage="No positions match the selected filters."
      />

      {rowsPending ? (
        <p role="status" aria-live="polite" style={{ margin: 0, color: themeTokens.color.textMuted }}>
          Refreshing table rows…
        </p>
      ) : null}

      {visibleRows.length === 0 ? (
        <Card title="No positions found">
          <p style={{ marginTop: 0 }}>Try clearing state/risk filters.</p>
          <Button type="button" variant="secondary" onClick={() => clearQuery(["assetClass", "state", "side", "riskFlag", "cursor", "page"])}>
            Clear filters
          </Button>
        </Card>
      ) : null}

      <div aria-label="Position pagination" style={{ display: "flex", alignItems: "center", gap: themeTokens.spacing.md, flexWrap: "wrap" }}>
        <span style={{ color: themeTokens.color.textMuted }}>
          Showing {visibleRows.length} positions • limit {pagination.limit}
        </span>
        {pagination.hasMore && pagination.nextCursor ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => updateQuery({ cursor: pagination.nextCursor, page: undefined }, { resetPagination: false })}
          >
            Next
          </Button>
        ) : (
          <span style={{ color: themeTokens.color.textMuted }}>No further cursor pages available.</span>
        )}
      </div>
    </section>
  );
}
