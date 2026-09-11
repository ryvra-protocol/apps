"use client";

import { Card, DataTable, InlineStatusIndicators, themeTokens } from "@ryvra/ui";
import { useMemo, useState } from "react";
import { filterApprovalsQueue, mapReasonCodeToPresentation, normalizeDecisionState, type AgentIntent, type DecisionState } from "../lib/finance-control";
import { formatDateTime } from "../lib/format";

interface ApprovalsQueueClientProps {
  intents: AgentIntent[];
  basePath: string;
  query: string;
}

export function ApprovalsQueueClient({ intents, basePath, query }: ApprovalsQueueClientProps) {
  const [state, setState] = useState<DecisionState | "ALL">("ALL");

  const visible = useMemo(() => (state === "ALL" ? intents : filterApprovalsQueue(intents, state)), [intents, state]);

  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.md }}>
      <Card title="Approvals and escalation queue">
        <label style={{ display: "grid", gap: themeTokens.spacing.xs, maxWidth: "220px" }}>
          <span>Decision state</span>
          <select className="approval-queue-control" aria-label="Filter approvals by decision state" value={state} onChange={(event) => setState(event.currentTarget.value === "ALL" ? "ALL" : normalizeDecisionState(event.currentTarget.value))}>
            <option value="ALL">ALL</option>
            <option value="REVIEW">REVIEW</option>
            <option value="CHALLENGE">CHALLENGE</option>
            <option value="DELAY">DELAY</option>
            <option value="QUARANTINE">QUARANTINE</option>
            <option value="BLOCKED">BLOCKED</option>
            <option value="APPROVED">APPROVED</option>
            <option value="DENIED">DENIED</option>
            <option value="CANCELED">CANCELED</option>
          </select>
        </label>

        <InlineStatusIndicators
          ariaLabel="Approvals queue indicators"
          items={[
            { id: "queue-count", label: "Intents", value: String(visible.length), tone: "neutral" },
            { id: "authority", label: "Authority", value: "Backend decisioning", tone: "warning" },
          ]}
        />
      </Card>

      <DataTable<AgentIntent>
        caption="Approval queue"
        rows={visible}
        getRowKey={(row) => row.id}
        emptyMessage="No intents in selected queue state."
        columns={[
          {
            key: "id",
            header: "Intent",
            render: (value) => <a href={`${basePath}/approvals/${value}${query ? `?${query}` : ""}`}>{String(value)}</a>,
          },
          { key: "agentId", header: "Agent" },
          { key: "action", header: "Action" },
          { key: "amount", header: "Amount" },
          { key: "asset", header: "Asset" },
          { key: "state", header: "State" },
          {
            key: "reasonCodes",
            header: "Reason",
            render: (value) => mapReasonCodeToPresentation((value as string[])[0] ?? "").title,
          },
          { key: "updatedAt", header: "Updated", render: (value) => formatDateTime(String(value)) },
        ]}
      />

      <style>{`
        .approval-queue-control {
          border: 1px solid ${themeTokens.color.borderStrong};
          border-radius: ${themeTokens.radius.md};
          padding: ${themeTokens.spacing.sm};
          background: ${themeTokens.color.surface};
          color: ${themeTokens.color.text};
        }

        .approval-queue-control:focus-visible {
          outline: ${themeTokens.focusRing.width} solid ${themeTokens.color.focusRing};
          outline-offset: ${themeTokens.focusRing.offset};
        }
      `}</style>
    </section>
  );
}
