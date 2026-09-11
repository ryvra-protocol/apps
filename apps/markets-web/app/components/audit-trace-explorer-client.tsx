"use client";

import { Button, Card, DataTable, InlineStatusIndicators, themeTokens } from "@ryvra/ui";
import { useMemo, useState } from "react";
import {
  buildAuditChainStatus,
  filterAuditTraceEvents,
  normalizeDecisionState,
  type AuditTraceEvent,
  type AuditTraceFilters,
} from "../lib/finance-control";
import { formatDateTime } from "../lib/format";

interface AuditTraceExplorerClientProps {
  events: AuditTraceEvent[];
  defaultFilters: AuditTraceFilters;
}

export function AuditTraceExplorerClient({ events, defaultFilters }: AuditTraceExplorerClientProps) {
  const [filters, setFilters] = useState<AuditTraceFilters>(defaultFilters);
  const setFilter = (key: keyof AuditTraceFilters, value: string | undefined) =>
    setFilters((current) => {
      const next: AuditTraceFilters = { ...current };
      if (value) {
        next[key] = value as never;
      } else {
        delete next[key];
      }
      return next;
    });

  const visibleEvents = useMemo(() => filterAuditTraceEvents(events, filters), [events, filters]);
  const chain = useMemo(() => buildAuditChainStatus(visibleEvents), [visibleEvents]);

  const hasFilters = Boolean(
    filters.intentId || filters.correlationId || filters.agentId || filters.mandateId || filters.decisionState || filters.from || filters.to,
  );

  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.md }}>
      <Card title="Audit and provenance filters">
        <form aria-label="Audit trace filters" onSubmit={(event) => event.preventDefault()} style={{ display: "grid", gap: themeTokens.spacing.sm, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <input className="audit-control" aria-label="Filter by intent id" placeholder="intentId" value={filters.intentId ?? ""} onChange={(event) => setFilter("intentId", event.currentTarget.value || undefined)} />
          <input className="audit-control" aria-label="Filter by correlation id" placeholder="correlationId" value={filters.correlationId ?? ""} onChange={(event) => setFilter("correlationId", event.currentTarget.value || undefined)} />
          <input className="audit-control" aria-label="Filter by agent id" placeholder="agentId" value={filters.agentId ?? ""} onChange={(event) => setFilter("agentId", event.currentTarget.value || undefined)} />
          <input className="audit-control" aria-label="Filter by mandate id" placeholder="mandateId" value={filters.mandateId ?? ""} onChange={(event) => setFilter("mandateId", event.currentTarget.value || undefined)} />
          <select className="audit-control" aria-label="Filter by decision state" value={filters.decisionState ?? ""} onChange={(event) => setFilter("decisionState", event.currentTarget.value ? normalizeDecisionState(event.currentTarget.value) : undefined)}>
            <option value="">All decisions</option>
            <option value="APPROVED">APPROVED</option>
            <option value="DENIED">DENIED</option>
            <option value="REVIEW">REVIEW</option>
            <option value="CHALLENGE">CHALLENGE</option>
            <option value="DELAY">DELAY</option>
            <option value="QUARANTINE">QUARANTINE</option>
            <option value="BLOCKED">BLOCKED</option>
          </select>
          <input className="audit-control" aria-label="Filter from time" type="datetime-local" value={filters.from ?? ""} onChange={(event) => setFilter("from", event.currentTarget.value || undefined)} />
          <input className="audit-control" aria-label="Filter to time" type="datetime-local" value={filters.to ?? ""} onChange={(event) => setFilter("to", event.currentTarget.value || undefined)} />
          <Button type="button" variant="secondary" disabled={!hasFilters} onClick={() => setFilters({})}>Reset</Button>
        </form>
      </Card>

      <InlineStatusIndicators
        ariaLabel="Audit integrity indicators"
        items={[
          { id: "rows", label: "Rows", value: String(visibleEvents.length), tone: "neutral" },
          { id: "hash-ok", label: "Hash verified", value: String(chain.verified), tone: "success" },
          { id: "hash-fail", label: "Hash unverified", value: String(chain.unverified), tone: chain.unverified > 0 ? "danger" : "neutral" },
        ]}
      />

      <DataTable<AuditTraceEvent>
        caption="Audit trace explorer"
        rows={visibleEvents}
        getRowKey={(row) => row.id}
        emptyMessage="No trace events match selected filters."
        columns={[
          { key: "timestamp", header: "Time", render: (value) => formatDateTime(String(value)) },
          { key: "agentId", header: "Agent" },
          { key: "intentId", header: "Intent" },
          { key: "stage", header: "Stage" },
          { key: "decisionState", header: "Decision" },
          { key: "reference", header: "Reference" },
          { key: "correlationId", header: "Correlation" },
        ]}
      />

      <style>{`
        .audit-control {
          border: 1px solid ${themeTokens.color.borderStrong};
          border-radius: ${themeTokens.radius.md};
          padding: ${themeTokens.spacing.sm};
          background: ${themeTokens.color.surface};
          color: ${themeTokens.color.text};
        }

        .audit-control:focus-visible {
          outline: ${themeTokens.focusRing.width} solid ${themeTokens.color.focusRing};
          outline-offset: ${themeTokens.focusRing.offset};
        }
      `}</style>
    </section>
  );
}
