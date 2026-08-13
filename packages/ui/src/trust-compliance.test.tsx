import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ComplianceEvidencePanel,
  ConfirmationReceiptCard,
  ErrorTransparencySummary,
  OperationTimelineCard,
  PolicyLinksCard,
  TRUST_REDACTED_VALUE,
  TRUST_UNAVAILABLE_VALUE,
  sanitizeTrustReferenceValue,
} from "./index";

test("operation timeline renders loading, empty, error, and success states", () => {
  const loading = renderToStaticMarkup(<OperationTimelineCard title="Claim timeline" state="loading" />);
  assert.match(loading, /Loading operation timeline/);

  const empty = renderToStaticMarkup(<OperationTimelineCard title="Claim timeline" state="empty" emptyMessage="No timeline yet" />);
  assert.match(empty, /No timeline yet/);

  const error = renderToStaticMarkup(<OperationTimelineCard title="Claim timeline" state="error" errorMessage="Timeline unavailable" />);
  assert.match(error, /Timeline unavailable/);

  const success = renderToStaticMarkup(
    <OperationTimelineCard
      title="Claim timeline"
      state="success"
      stages={[
        {
          id: "confirm",
          label: "Confirmation",
          status: "completed",
          timestamp: "2026-08-09T15:00:00.000Z",
        },
        {
          id: "submit",
          label: "Submission",
          status: "current",
          timestamp: "2026-08-09T15:00:01.000Z",
          current: true,
        },
      ]}
    />,
  );

  assert.match(success, /Confirmation/);
  assert.match(success, /Submission/);
  assert.match(success, /aria-current="step"/);
  assert.match(success, /Aug 09, 2026/);
  assert.match(success, /UTC/);
});

test("status progression mapping surfaces stage status badges and accessibility labels", () => {
  const markup = renderToStaticMarkup(
    <OperationTimelineCard
      title="Task progression"
      state="success"
      stages={[
        {
          id: "created",
          label: "Created",
          status: "completed",
          timestamp: "2026-08-09T15:00:00.000Z",
        },
        {
          id: "processing",
          label: "Processing",
          status: "current",
          timestamp: "2026-08-09T15:02:00.000Z",
          current: true,
          references: [{ label: "Task ID", value: "task_123" }],
        },
      ]}
    />,
  );

  assert.match(markup, /Task progression timeline/);
  assert.match(markup, /Processing status current/);
  assert.match(markup, /aria-label="Task ID reference value"/);
  assert.match(markup, /tabindex="0"/);
});

test("compliance evidence panel shows content and redacts sensitive values", () => {
  const markup = renderToStaticMarkup(
    <ComplianceEvidencePanel
      sourceSystem="pay"
      retryable
      lastUpdated="2026-08-09T15:02:00.000Z"
      references={[
        { label: "Request ID", value: "req_123" },
        { label: "Authorization token", value: "******" },
        { label: "Correlation ID" },
      ]}
    />,
  );

  assert.match(markup, /Source system/);
  assert.match(markup, /pay/);
  assert.match(markup, /Retryable/);
  assert.match(markup, /Yes/);
  assert.match(markup, /Request ID/);
  assert.match(markup, /req_123/);
  assert.match(markup, new RegExp(TRUST_REDACTED_VALUE));
  assert.match(markup, new RegExp(TRUST_UNAVAILABLE_VALUE));
  assert.doesNotMatch(markup, /secret-token/);
});

test("error transparency summary differentiates retryable and non-retryable guidance", () => {
  const retryableMarkup = renderToStaticMarkup(
    <ErrorTransparencySummary message="Temporary upstream timeout" retryable source="pay" retryActionLabel="Retry payout" />,
  );
  assert.match(retryableMarkup, /Retry is safe after you confirm the same intent details/);
  assert.match(retryableMarkup, /Retry payout/);

  const nonRetryableMarkup = renderToStaticMarkup(
    <ErrorTransparencySummary message="Policy denied operation" retryable={false} source="policy_risk" />,
  );
  assert.match(nonRetryableMarkup, /Retry is not safe automatically/);
  assert.match(nonRetryableMarkup, /Review the operation details panel/);
});

test("confirmation receipt renders references and operation ids", () => {
  const markup = renderToStaticMarkup(
    <ConfirmationReceiptCard
      operationLabel="Payout claim submitted"
      status="success"
      confirmedAt="2026-08-09T15:03:00.000Z"
      references={[
        { label: "Intent ID", value: "intent_123" },
        { label: "Request ID", value: "req_456" },
        { label: "Correlation ID", value: "corr_789" },
      ]}
    />,
  );

  assert.match(markup, /Payout claim submitted/);
  assert.match(markup, /Intent ID/);
  assert.match(markup, /intent_123/);
  assert.match(markup, /req_456/);
  assert.match(markup, /corr_789/);
});

test("policy links card exposes accessible policy/help navigation", () => {
  const markup = renderToStaticMarkup(
    <PolicyLinksCard
      links={[
        { href: "/status", label: "Status diagnostics" },
        { href: "/overview", label: "Operational overview" },
      ]}
    />,
  );

  assert.match(markup, /aria-label="Policy and help links"/);
  assert.match(markup, /Status diagnostics/);
  assert.match(markup, /Operational overview/);
});

test("sanitizeTrustReferenceValue preserves operation ids and redacts secrets", () => {
  assert.equal(sanitizeTrustReferenceValue("Request ID", "req_abc123"), "req_abc123");
  assert.equal(sanitizeTrustReferenceValue("Auth token", "******"), TRUST_REDACTED_VALUE);
  assert.equal(sanitizeTrustReferenceValue("Correlation ID"), TRUST_UNAVAILABLE_VALUE);
});
