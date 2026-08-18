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

test("p2p send flow validates inputs and transitions between review/submission states", async () => {
  const module = await loadWorkspaceModule<{
    validateP2pSendDraft: (draft: {
      recipientHandle: string;
      amountInput: string;
      memo?: string;
      currency: string;
    }) => { valid: boolean; value?: { amountMinor: number; recipientHandle: string } };
    transitionP2pSendStep: (state: string, event: string) => string;
  }>("../../apps/pay-web/app/lib/p2p.ts");

  const valid = module.validateP2pSendDraft({
    recipientHandle: "@alice_wallet",
    amountInput: "12.50",
    memo: "Lunch split",
    currency: "usd",
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.value?.amountMinor, 1250);
  assert.equal(valid.value?.recipientHandle, "@alice_wallet");

  const invalid = module.validateP2pSendDraft({
    recipientHandle: "a",
    amountInput: "-5",
    currency: "USD",
  });
  assert.equal(invalid.valid, false);

  assert.equal(module.transitionP2pSendStep("entry", "CONTINUE"), "review");
  assert.equal(module.transitionP2pSendStep("review", "SUBMIT"), "submitting");
  assert.equal(module.transitionP2pSendStep("submitting", "SUCCESS"), "success");
  assert.equal(module.transitionP2pSendStep("submitting", "FAILURE"), "failure");
});

test("p2p receive/request surfaces include explicit deferred fallback messaging", () => {
  const receiveSource = readSource("apps/pay-web/app/components/p2p-receive-client.tsx");
  assert.match(receiveSource, /Not available in current environment: request-payment backend endpoint is deferred/);
  assert.match(receiveSource, /Request payment is currently preview-only and does not persist remotely/);
  assert.match(receiveSource, /aria-label="Request payment form"/);
});

test("p2p status mapping and lifecycle notifications align to initiated/processing/completed/failed", async () => {
  const p2pModule = await loadWorkspaceModule<{
    resolveP2pNotificationStageFromIntentState: (state?: string) => "initiated" | "processing" | "completed" | "failed";
  }>("../../apps/pay-web/app/lib/p2p.ts");
  const notifications = await loadWorkspaceModule<{
    buildP2pLifecycleNotification: (input: {
      stage: "initiated" | "processing" | "completed" | "failed";
      recipientHandle?: string;
      intentId?: string;
      requestId?: string;
      correlationId?: string;
      retryable?: boolean;
    }) => { severity: string; message: string; category: string };
  }>("../../apps/pay-web/app/lib/notification-comms.ts");

  assert.equal(p2pModule.resolveP2pNotificationStageFromIntentState("created"), "initiated");
  assert.equal(p2pModule.resolveP2pNotificationStageFromIntentState("executing"), "processing");
  assert.equal(p2pModule.resolveP2pNotificationStageFromIntentState("settled"), "completed");
  assert.equal(p2pModule.resolveP2pNotificationStageFromIntentState("failed"), "failed");

  const initiated = notifications.buildP2pLifecycleNotification({ stage: "initiated", recipientHandle: "@alice", requestId: "req-1" });
  assert.equal(initiated.category, "payouts");
  assert.equal(initiated.severity, "info");

  const completed = notifications.buildP2pLifecycleNotification({ stage: "completed", recipientHandle: "@alice", intentId: "intent-1" });
  assert.equal(completed.severity, "success");
  assert.match(completed.message, /completed/i);
});

test("merchant dashboard data model supports loading/empty/error/success render paths", async () => {
  const merchant = await loadWorkspaceModule<{
    buildMerchantTransactions: (input: {
      invoices: Array<{ id: string; invoiceNumber: string; customerName: string; amountMinor: number; currency: string; status: string; issuedAt: string }>;
      payouts: Array<{ id: string; amountMinor: number; currency: string; status: string; destinationLabel: string; createdAt: string }>;
      reconciliation: Array<{ id: string; runId: string; entityId: string; status: string; actualAmountMinor: number; currency: string; updatedAt: string }>;
    }) => Array<{ status: string }>;
    buildMerchantKpis: (rows: Array<{ status: string; amountMinor: number; currency: string }>) => {
      totalCount: number;
      successfulCount: number;
      pendingCount: number;
      failedCount: number;
      successfulRate: number;
    };
  }>("../../apps/pay-web/app/lib/merchant-dashboard.ts");

  const rows = merchant.buildMerchantTransactions({
    invoices: [
      {
        id: "inv-1",
        invoiceNumber: "INV-1",
        customerName: "Northwind Logistics",
        amountMinor: 5000,
        currency: "USD",
        status: "PAID",
        issuedAt: "2026-08-01T00:00:00.000Z",
      },
    ],
    payouts: [
      {
        id: "po-1",
        amountMinor: 4500,
        currency: "USD",
        status: "FAILED",
        destinationLabel: "Treasury Dest",
        createdAt: "2026-08-02T00:00:00.000Z",
      },
    ],
    reconciliation: [
      {
        id: "rec-1",
        runId: "run-1",
        entityId: "po-1",
        status: "PROCESSING",
        actualAmountMinor: 4500,
        currency: "USD",
        updatedAt: "2026-08-03T00:00:00.000Z",
      },
    ],
  });

  const kpis = merchant.buildMerchantKpis(rows as Array<{ status: string; amountMinor: number; currency: string }>);
  assert.equal(kpis.totalCount, 3);
  assert.equal(kpis.successfulCount, 1);
  assert.equal(kpis.pendingCount, 1);
  assert.equal(kpis.failedCount, 1);

  const emptyKpis = merchant.buildMerchantKpis([]);
  assert.equal(emptyKpis.totalCount, 0);
  assert.equal(emptyKpis.successfulRate, 0);

  const merchantPage = readSource("apps/pay-web/app/merchant/page.tsx");
  assert.match(merchantPage, /MerchantDashboardClient/);
  assert.match(merchantPage, /ErrorState/);
  assert.match(readSource("apps/pay-web/app/merchant/loading.tsx"), /Loading merchant dashboard/);
});

test("merchant filters/actions include deferred-state messaging when backend operations are unavailable", async () => {
  const merchant = await loadWorkspaceModule<{
    filterMerchantTransactions: (
      rows: Array<{ status: string; reference: string; type: string; payer: string; payee: string; timestamp: string }>,
      filters: { status?: string; search?: string; from?: string; to?: string },
    ) => Array<{ status: string; reference: string }>;
    resolveMerchantActionAvailability: (input: { mode: "mock" | "http"; hasRows: boolean; hasFailedRows: boolean }) => {
      createPaymentLink: { enabled: boolean; reason?: string };
      exportTransactions: { enabled: boolean; reason?: string };
      retryFailed: { enabled: boolean; reason?: string };
    };
  }>("../../apps/pay-web/app/lib/merchant-dashboard.ts");

  const filtered = merchant.filterMerchantTransactions(
    [
      {
        status: "FAILED",
        reference: "PO-1",
        type: "payout",
        payer: "Treasury",
        payee: "Vendor",
        timestamp: "2026-08-02T00:00:00.000Z",
      },
      {
        status: "PAID",
        reference: "INV-2",
        type: "invoice",
        payer: "Client",
        payee: "Workspace",
        timestamp: "2026-08-03T00:00:00.000Z",
      },
    ],
    { status: "FAILED", search: "PO-1" },
  );
  assert.equal(filtered.length, 1);

  const deferred = merchant.resolveMerchantActionAvailability({ mode: "mock", hasRows: true, hasFailedRows: true });
  assert.equal(deferred.createPaymentLink.enabled, false);
  assert.match(deferred.createPaymentLink.reason ?? "", /deferred/i);
  assert.equal(deferred.exportTransactions.enabled, true);
  assert.equal(deferred.retryFailed.enabled, false);
  assert.match(deferred.retryFailed.reason ?? "", /deferred|no failed transactions/i);
});

test("merchant dashboard route enforces explicit admin gating with permission-denied fallback", () => {
  const merchantPage = readSource("apps/pay-web/app/merchant/page.tsx");
  assert.match(merchantPage, /canAccessWorkspaceCapability\(runtime\.workspaceRole, "admin"\)/);
  assert.match(merchantPage, /PermissionDeniedState/);
  assert.match(merchantPage, /resolveRoutePermissionMeta\("pay", "\/merchant"\)/);
});

test("phase 21 accessibility hooks exist for labels, focus-visible styling, and keyboard table interaction", () => {
  const sendSource = readSource("apps/pay-web/app/components/p2p-send-flow-client.tsx");
  const historySource = readSource("apps/pay-web/app/components/p2p-history-table-client.tsx");
  const merchantSource = readSource("apps/pay-web/app/components/merchant-dashboard-client.tsx");

  assert.match(sendSource, /aria-label="P2P send form"/);
  assert.match(sendSource, /\.p2p-send-control:focus-visible/);

  assert.match(historySource, /aria-label="P2P history filters"/);
  assert.match(historySource, /\.p2p-history-control:focus-visible/);

  assert.match(merchantSource, /aria-label="Merchant transaction filters"/);
  assert.match(merchantSource, /rowLabel=\{/);
  assert.match(merchantSource, /onRowClick=\{/);
  assert.match(merchantSource, /\.merchant-filter-control:focus-visible/);
});
