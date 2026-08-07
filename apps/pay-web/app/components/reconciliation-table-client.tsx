"use client";

import { reconciliationStatuses, type PayPaginationMeta, type ReconciliationItemDto } from "@ryvra/domain-payments";
import { Button, Card, DataTable, themeTokens } from "@ryvra/ui";
import { useMemo, useState } from "react";
import { formatCurrencyMinor, formatDateTime } from "../lib/format";
import { StatusBadge } from "./status-badge";
import { useQueryFilters } from "./use-query-filters";

interface ReconciliationTableClientProps {
  items: ReconciliationItemDto[];
  pagination: PayPaginationMeta;
}

const reconciliationStatusOptions = ["ALL", ...reconciliationStatuses] as const;

export function ReconciliationTableClient({ items, pagination }: ReconciliationTableClientProps) {
  const { searchParams, updateQuery, clearQuery } = useQueryFilters();
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const statusParam = (searchParams.get("status") ?? "ALL").toUpperCase();
  const status = reconciliationStatusOptions.includes(statusParam as (typeof reconciliationStatusOptions)[number])
    ? statusParam
    : "ALL";
  const exceptionOnly = searchParams.get("exceptionOnly") === "true";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const hasFilters = status !== "ALL" || exceptionOnly || from.length > 0 || to.length > 0;

  const sortedItems = useMemo(() => {
    return [...items].sort((left, right) => (left.updatedAt < right.updatedAt ? 1 : -1));
  }, [items]);

  const canGoPrev = pagination.page > 1;
  const canGoNext = pagination.page < pagination.totalPages;

  return (
    <section aria-labelledby="reconciliation-table-title" style={{ display: "grid", gap: themeTokens.spacing.md }}>
      <style>{`
        .pay-filter-control {
          border: 1px solid ${themeTokens.color.borderStrong};
          border-radius: ${themeTokens.radius.md};
          padding: ${themeTokens.spacing.sm};
          font-size: ${themeTokens.typography.size.sm};
          color: ${themeTokens.color.text};
          background: ${themeTokens.color.surface};
        }

        .pay-filter-control:focus-visible {
          outline: ${themeTokens.focusRing.width} solid ${themeTokens.color.focusRing};
          outline-offset: ${themeTokens.focusRing.offset};
        }
      `}</style>

      <h3 id="reconciliation-table-title" style={{ margin: 0, fontSize: themeTokens.typography.size.lg }}>
        Reconciliation runs and items
      </h3>

      <Card>
        <form
          aria-label="Reconciliation filters"
          onSubmit={(event) => event.preventDefault()}
          style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
        >
          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Status</span>
            <select
              className="pay-filter-control"
              value={status}
              onChange={(event) => updateQuery({ status: event.currentTarget.value === "ALL" ? undefined : event.currentTarget.value })}
            >
              {reconciliationStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>From date</span>
            <input
              className="pay-filter-control"
              type="date"
              value={from}
              onChange={(event) => updateQuery({ from: event.currentTarget.value || undefined })}
            />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>To date</span>
            <input
              className="pay-filter-control"
              type="date"
              value={to}
              onChange={(event) => updateQuery({ to: event.currentTarget.value || undefined })}
            />
          </label>

          <label style={{ display: "inline-flex", alignItems: "center", gap: themeTokens.spacing.sm }}>
            <input
              type="checkbox"
              checked={exceptionOnly}
              onChange={(event) => updateQuery({ exceptionOnly: event.currentTarget.checked ? "true" : undefined })}
            />
            <span>Exceptions only</span>
          </label>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => clearQuery(["status", "from", "to", "exceptionOnly", "page"])}
              disabled={!hasFilters}
              aria-describedby={!hasFilters ? "recon-reset-hint" : undefined}
            >
              Reset filters
            </Button>
          </div>
        </form>
        {!hasFilters ? (
          <p id="recon-reset-hint" style={{ marginBottom: 0, color: themeTokens.color.textMuted }}>
            Reset is disabled because no filters are currently applied.
          </p>
        ) : null}
      </Card>

      <DataTable<ReconciliationItemDto>
        caption="Reconciliation items sorted by updated date"
        columns={[
          { key: "runId", header: "Run" },
          { key: "entityType", header: "Entity type" },
          { key: "entityId", header: "Entity id" },
          {
            key: "status",
            header: "Status",
            render: (value) => <StatusBadge status={String(value)} />,
          },
          {
            key: "deltaMinor",
            header: "Delta",
            render: (value, row) => formatCurrencyMinor(value as number, row.currency),
          },
          {
            key: "updatedAt",
            header: "Updated",
            render: (value) => formatDateTime(String(value)),
          },
        ]}
        rows={sortedItems}
        getRowKey={(row) => row.id}
        rowLabel={(row) => `Reconciliation item ${row.id}`}
        onRowClick={(row) => setExpandedItemId((current) => (current === row.id ? null : row.id))}
        isRowExpanded={(row) => expandedItemId === row.id}
        renderExpandedRow={(row) => (
          <div style={{ display: "grid", gap: themeTokens.spacing.sm }}>
            <strong>Run {row.runId}</strong>
            <span>
              Expected: {formatCurrencyMinor(row.expectedAmountMinor, row.currency)} • Actual: {formatCurrencyMinor(row.actualAmountMinor, row.currency)}
            </span>
            {row.exceptionCode ? <span>Exception code: {row.exceptionCode}</span> : <span>No exception code on this row.</span>}
            {row.exceptionMessage ? <span>Exception detail: {row.exceptionMessage}</span> : null}
            <span>Created: {formatDateTime(row.createdAt)}</span>
          </div>
        )}
        emptyMessage="No reconciliation items match the selected filters."
      />

      {sortedItems.length === 0 ? (
        <Card title="No reconciliation items found">
          <p style={{ marginTop: 0 }}>Try broadening filters or disable exceptions-only mode.</p>
          <Button type="button" variant="secondary" onClick={() => clearQuery(["status", "from", "to", "exceptionOnly", "page"])}>
            Clear filters
          </Button>
        </Card>
      ) : null}

      <div
        aria-label="Reconciliation pagination"
        style={{ display: "flex", alignItems: "center", gap: themeTokens.spacing.md, flexWrap: "wrap" }}
      >
        <span style={{ color: themeTokens.color.textMuted }}>
          Page {pagination.page} of {pagination.totalPages} • {pagination.total} total reconciliation items
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
