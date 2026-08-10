"use client";

import {
  payoutDestinationTypes,
  payoutStatuses,
  type PayPaginationMeta,
  type PayoutDto,
} from "@ryvra/domain-payments";
import {
  Button,
  Card,
  DataTable,
  DelegationProvenanceChips,
  delegationViewFilters,
  matchesDelegationView,
  useNotificationCenter,
  themeTokens,
} from "@ryvra/ui";
import { useDeferredValue, useEffect } from "react";
import { buildPayoutDelegationContext, supportsPayoutDelegationVisibility } from "../lib/delegation-context";
import { formatCurrencyMinor, formatDateTime } from "../lib/format";
import { buildPayoutStatusNotification } from "../lib/notification-comms";
import { StatusBadge } from "./status-badge";
import { useQueryFilters } from "./use-query-filters";

interface PayoutsTableClientProps {
  items: PayoutDto[];
  pagination: PayPaginationMeta;
  currentUserId?: string;
}

const payoutStatusOptions = ["ALL", ...payoutStatuses] as const;
const payoutDestinationOptions = ["ALL", ...payoutDestinationTypes] as const;

export function PayoutsTableClient({ items, pagination, currentUserId }: PayoutsTableClientProps) {
  const { searchParams, updateQuery, clearQuery } = useQueryFilters();
  const { addNotification } = useNotificationCenter();

  const statusParam = (searchParams.get("status") ?? "ALL").toUpperCase();
  const destinationTypeParam = (searchParams.get("destinationType") ?? "ALL").toUpperCase();
  const status = payoutStatusOptions.includes(statusParam as (typeof payoutStatusOptions)[number]) ? statusParam : "ALL";
  const destinationType = payoutDestinationOptions.includes(destinationTypeParam as (typeof payoutDestinationOptions)[number])
    ? destinationTypeParam
    : "ALL";
  const delegationParam = (searchParams.get("delegation") ?? "all").toLowerCase();
  const delegationFilter = delegationViewFilters.includes(delegationParam as (typeof delegationViewFilters)[number])
    ? (delegationParam as (typeof delegationViewFilters)[number])
    : "all";
  const delegationAvailable = supportsPayoutDelegationVisibility();
  const appliedDelegationFilter = delegationAvailable ? delegationFilter : "all";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const hasFilters =
    status !== "ALL" ||
    destinationType !== "ALL" ||
    from.length > 0 ||
    to.length > 0 ||
    delegationFilter !== "all";

  const deferredItems = useDeferredValue(items);
  const visibleRows = deferredItems.filter((item) =>
    matchesDelegationView(buildPayoutDelegationContext(item), appliedDelegationFilter, currentUserId),
  );
  const rowsPending = deferredItems !== items;

  useEffect(() => {
    for (const payout of items.slice(0, 25)) {
      addNotification(buildPayoutStatusNotification(payout));
    }
  }, [addNotification, items]);

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

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Delegation view</span>
            <select
              className="pay-filter-control"
              value={delegationFilter}
              aria-label="Delegation filter"
              disabled={!delegationAvailable}
              onChange={(event) => updateQuery({ delegation: event.currentTarget.value === "all" ? undefined : event.currentTarget.value })}
            >
              <option value="all">All operations</option>
              <option value="mine">Mine</option>
              <option value="delegated_to_me">Delegated to me</option>
              <option value="delegated_by_me">Delegated by me</option>
            </select>
          </label>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => clearQuery(["status", "destinationType", "from", "to", "delegation", "page"])}
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
        {!delegationAvailable ? (
          <p style={{ marginBottom: 0, color: themeTokens.color.textMuted }}>
            Delegated actor metadata: Not available in current environment.
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
            key: "id",
            header: "Provenance",
            render: (_value, row) => <DelegationProvenanceChips context={buildPayoutDelegationContext(row)} />,
          },
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
          <Button type="button" variant="secondary" onClick={() => clearQuery(["status", "destinationType", "from", "to", "delegation", "page"])}>
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
