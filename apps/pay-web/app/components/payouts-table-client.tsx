"use client";

import {
  payoutDestinationTypes,
  payoutStatuses,
  type PayPaginationMeta,
  type PayoutDto,
} from "@ryvra/domain-payments";
import { Button, Card, DataTable, themeTokens } from "@ryvra/ui";
import { useDeferredValue } from "react";
import { formatCurrencyMinor, formatDateTime } from "../lib/format";
import { StatusBadge } from "./status-badge";
import { useQueryFilters } from "./use-query-filters";

interface PayoutsTableClientProps {
  items: PayoutDto[];
  pagination: PayPaginationMeta;
}

const payoutStatusOptions = ["ALL", ...payoutStatuses] as const;
const payoutDestinationOptions = ["ALL", ...payoutDestinationTypes] as const;

export function PayoutsTableClient({ items, pagination }: PayoutsTableClientProps) {
  const { searchParams, updateQuery, clearQuery } = useQueryFilters();

  const statusParam = (searchParams.get("status") ?? "ALL").toUpperCase();
  const destinationTypeParam = (searchParams.get("destinationType") ?? "ALL").toUpperCase();
  const status = payoutStatusOptions.includes(statusParam as (typeof payoutStatusOptions)[number]) ? statusParam : "ALL";
  const destinationType = payoutDestinationOptions.includes(destinationTypeParam as (typeof payoutDestinationOptions)[number])
    ? destinationTypeParam
    : "ALL";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const hasFilters = status !== "ALL" || destinationType !== "ALL" || from.length > 0 || to.length > 0;

  const deferredItems = useDeferredValue(items);
  const visibleRows = deferredItems;
  const rowsPending = deferredItems !== items;

  const canGoPrev = pagination.page > 1;
  const canGoNext = pagination.page < pagination.totalPages;

  return (
    <section aria-labelledby="payouts-table-title" style={{ display: "grid", gap: themeTokens.spacing.md }}>
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

      <h3 id="payouts-table-title" style={{ margin: 0, fontSize: themeTokens.typography.size.lg }}>
        Payout list
      </h3>

      <Card>
        <form
          aria-label="Payout filters"
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
              {payoutStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Destination type</span>
            <select
              className="pay-filter-control"
              value={destinationType}
              onChange={(event) =>
                updateQuery({ destinationType: event.currentTarget.value === "ALL" ? undefined : event.currentTarget.value })
              }
            >
              {payoutDestinationOptions.map((option) => (
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

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => clearQuery(["status", "destinationType", "from", "to", "page"])}
              disabled={!hasFilters}
              aria-describedby={!hasFilters ? "payout-reset-hint" : undefined}
            >
              Reset filters
            </Button>
          </div>
        </form>
        {!hasFilters ? (
          <p id="payout-reset-hint" style={{ marginBottom: 0, color: themeTokens.color.textMuted }}>
            Reset is disabled because no filters are currently applied.
          </p>
        ) : null}
      </Card>

      <DataTable<PayoutDto>
        caption="Payouts sorted by created date"
        columns={[
          { key: "id", header: "Payout" },
          {
            key: "status",
            header: "Status",
            render: (value) => <StatusBadge status={String(value)} />,
          },
          {
            key: "amountMinor",
            header: "Amount",
            render: (value, row) => formatCurrencyMinor(value as number, row.currency),
          },
          { key: "destinationLabel", header: "Destination" },
          {
            key: "createdAt",
            header: "Created",
            render: (value) => formatDateTime(String(value)),
          },
        ]}
        rows={visibleRows}
        getRowKey={(row) => row.id}
        emptyMessage="No payouts match the selected filters."
      />

      {rowsPending ? (
        <p role="status" aria-live="polite" style={{ margin: 0, color: themeTokens.color.textMuted }}>
          Refreshing table rows…
        </p>
      ) : null}

      {visibleRows.length === 0 ? (
        <Card title="No payouts found">
          <p style={{ marginTop: 0 }}>Try changing status, destination type, or date filters.</p>
          <Button type="button" variant="secondary" onClick={() => clearQuery(["status", "destinationType", "from", "to", "page"])}>
            Clear filters
          </Button>
        </Card>
      ) : null}

      <div aria-label="Payout pagination" style={{ display: "flex", alignItems: "center", gap: themeTokens.spacing.md, flexWrap: "wrap" }}>
        <span style={{ color: themeTokens.color.textMuted }}>
          Page {pagination.page} of {pagination.totalPages} • {pagination.total} total payouts
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
