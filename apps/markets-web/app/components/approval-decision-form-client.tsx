"use client";

import { Button, Card, InlineStatusIndicators, themeTokens } from "@ryvra/ui";
import { useState } from "react";
import { decisionStates, normalizeDecisionState, requiresOperatorReason, type DecisionState } from "../lib/finance-control";

interface ApprovalDecisionFormClientProps {
  intentId: string;
  initialState: DecisionState;
}

export function ApprovalDecisionFormClient({ intentId, initialState }: ApprovalDecisionFormClientProps) {
  const [decision, setDecision] = useState<DecisionState>(initialState);
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<string>("Idle");
  const [submitting, setSubmitting] = useState(false);

  const requiresReason = requiresOperatorReason(decision);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requiresReason && reason.trim().length === 0) {
      setStatus("Reason is required for this decision.");
      return;
    }

    setSubmitting(true);
    setStatus("Submitting decision...");

    try {
      const response = await fetch(`/api/approvals/${intentId}/decision`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          decision,
          reason,
          comment,
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; data?: { auditReference?: string }; error?: { message?: string } };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message ?? "Decision request failed");
      }

      setStatus(`Decision submitted. Audit reference: ${payload.data?.auditReference ?? "unavailable"}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to submit decision");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="Decision controls">
      <form aria-label="Approval decision form" onSubmit={onSubmit} style={{ display: "grid", gap: themeTokens.spacing.md }}>
        <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
          <span>Action</span>
          <select
            className="approval-control"
            value={decision}
            onChange={(event) => setDecision(normalizeDecisionState(event.currentTarget.value))}
          >
            {decisionStates.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
          <span>Operator reason {requiresReason ? "(required)" : "(optional)"}</span>
          <input
            className="approval-control"
            aria-label="Operator reason"
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
            placeholder="policy_threshold_exceeded"
          />
        </label>

        <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
          <span>Comment</span>
          <textarea
            className="approval-control"
            aria-label="Operator comment"
            value={comment}
            onChange={(event) => setComment(event.currentTarget.value)}
            rows={3}
          />
        </label>

        <InlineStatusIndicators
          ariaLabel="Decision boundary indicators"
          items={[
            { id: "frontend-boundary", label: "Authority", value: "Backend only", tone: "warning" },
            { id: "intent-id", label: "Intent", value: intentId, tone: "neutral" },
          ]}
        />

        <Button type="submit" disabled={submitting} variant="primary">
          {submitting ? "Submitting..." : "Submit decision"}
        </Button>

        <p role="status" aria-live="polite" style={{ margin: 0, color: themeTokens.color.textMuted }}>
          {status}
        </p>
      </form>

      <style>{`
        .approval-control {
          border: 1px solid ${themeTokens.color.borderStrong};
          border-radius: ${themeTokens.radius.md};
          padding: ${themeTokens.spacing.sm};
          background: ${themeTokens.color.surface};
          color: ${themeTokens.color.text};
        }
        .approval-control:focus-visible {
          outline: ${themeTokens.focusRing.width} solid ${themeTokens.color.focusRing};
          outline-offset: ${themeTokens.focusRing.offset};
        }
      `}</style>
    </Card>
  );
}
