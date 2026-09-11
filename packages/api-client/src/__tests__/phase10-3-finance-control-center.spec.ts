import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

async function loadWorkspaceModule<TModule extends object>(relativeToApiClient: string): Promise<TModule> {
  const absolutePath = path.resolve(process.cwd(), relativeToApiClient);
  return (await import(pathToFileURL(absolutePath).href)) as TModule;
}

function readSource(relativePathFromRepoRoot: string): string {
  const repoRoot = path.resolve(process.cwd(), "../..");
  return readFileSync(path.join(repoRoot, relativePathFromRepoRoot), "utf8");
}

test("agent console route files and private perps route files are present with expected navigation", () => {
  const agentsPage = readSource("apps/markets-web/app/agents/page.tsx");
  const perpsPage = readSource("apps/markets-web/app/perps/page.tsx");

  assert.match(agentsPage, /Agent Console/);
  assert.match(agentsPage, /\/agents\//);
  assert.match(agentsPage, /ApprovalsQueueClient/);

  assert.match(perpsPage, /\/perps\/private/);
  assert.match(perpsPage, /\/perps\/positions/);
  assert.match(perpsPage, /\/perps\/history/);
});

test("approval decision state handling and reason-code mapping are deterministic", async () => {
  const module = await loadWorkspaceModule<{
    normalizeDecisionState: (value?: string) => string;
    mapReasonCodeToPresentation: (code: string) => { title: string; message: string };
  }>("../../apps/markets-web/app/lib/finance-control.ts");

  assert.equal(module.normalizeDecisionState("approved"), "APPROVED");
  assert.equal(module.normalizeDecisionState("quarantine"), "QUARANTINE");
  assert.equal(module.normalizeDecisionState("unknown"), "REVIEW");

  const mapped = module.mapReasonCodeToPresentation("policy_threshold_exceeded");
  assert.match(mapped.title, /Policy threshold exceeded/);

  const fallback = module.mapReasonCodeToPresentation("unmapped_code");
  assert.match(fallback.message, /Backend returned reason code/i);
});

test("approval detail route renders authority/provenance references", () => {
  const detail = readSource("apps/markets-web/app/agents/approvals/[intentId]/page.tsx");

  assert.match(detail, /mandateId/);
  assert.match(detail, /policyVersion/);
  assert.match(detail, /riskAssessmentId/);
  assert.match(detail, /authorizationId/);
  assert.match(detail, /correlationId/);
  assert.match(detail, /idempotencyKey/);
  assert.match(detail, /Provenance refs/);
});

test("emergency control confirmation flow and high-trust checks are enforced", () => {
  const emergencyClient = readSource("apps/markets-web/app/components/emergency-controls-client.tsx");
  const emergencyApi = readSource("apps/markets-web/app/api/agents/[id]/controls/route.ts");

  assert.match(emergencyClient, /CONFIRM \$\{operation\}/);
  assert.match(emergencyClient, /High-trust operation: admin flow required/);
  assert.match(emergencyApi, /high_trust_required/);
  assert.match(emergencyApi, /canAccessWorkspaceCapability\(runtime\.workspaceRole, "admin"\)/);
});

test("audit trace filtering works for intent, decision state, and date range", async () => {
  const module = await loadWorkspaceModule<{
    filterAuditTraceEvents: (
      events: Array<{ intentId: string; decisionState: string; timestamp: string; correlationId: string; agentId: string; mandateId: string }>,
      filters: { intentId?: string; decisionState?: string; from?: string; to?: string },
    ) => unknown[];
  }>("../../apps/markets-web/app/lib/finance-control.ts");

  const events = [
    {
      intentId: "i-1",
      decisionState: "REVIEW",
      timestamp: "2026-09-11T10:00:00.000Z",
      correlationId: "c-1",
      agentId: "a-1",
      mandateId: "m-1",
    },
    {
      intentId: "i-2",
      decisionState: "APPROVED",
      timestamp: "2026-09-11T12:00:00.000Z",
      correlationId: "c-2",
      agentId: "a-2",
      mandateId: "m-2",
    },
  ];

  assert.equal(module.filterAuditTraceEvents(events, { intentId: "i-1" }).length, 1);
  assert.equal(module.filterAuditTraceEvents(events, { decisionState: "APPROVED" }).length, 1);
  assert.equal(module.filterAuditTraceEvents(events, { from: "2026-09-11T11:00:00.000Z" }).length, 1);
});

test("security boundary and accessibility labels exist for critical controls", () => {
  const approvalsClient = readSource("apps/markets-web/app/components/approval-decision-form-client.tsx");
  const auditClient = readSource("apps/markets-web/app/components/audit-trace-explorer-client.tsx");

  assert.match(approvalsClient, /Authority", value: "Backend only/);
  assert.match(approvalsClient, /aria-label="Approval decision form"/);
  assert.match(auditClient, /aria-label="Audit trace filters"/);
  assert.match(auditClient, /Filter by intent id/);
});
