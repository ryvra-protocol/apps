import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

async function loadWorkspaceModule<TModule extends object>(relativeToApiClient: string): Promise<TModule> {
  const absolutePath = path.resolve(process.cwd(), relativeToApiClient);
  return (await import(pathToFileURL(absolutePath).href)) as TModule;
}

test("nav icon mapping is consistent across all app nav routes", async () => {
  const routing = await loadWorkspaceModule<{
    getGlobalNavItems: (options: { currentProduct: "pay" | "markets" | "points" }) => Array<{ id: string }>;
    getProductNav: (product: "pay" | "markets" | "points") => Array<{ id: string }>;
  }>("../config/src/routing.ts");
  const navIcons = await loadWorkspaceModule<{
    NAV_ICON_SIZE: number;
    NAV_ICON_STROKE_WIDTH: number;
    resolveNavIconName: (itemId: string) => string;
  }>("../ui/src/nav-icons.ts");

  const products: Array<"pay" | "markets" | "points"> = ["pay", "markets", "points"];
  const allIds = new Set<string>();

  for (const product of products) {
    for (const item of routing.getGlobalNavItems({ currentProduct: product })) {
      allIds.add(item.id);
    }

    for (const item of routing.getProductNav(product)) {
      allIds.add(item.id);
    }
  }

  assert.equal(navIcons.NAV_ICON_SIZE, 18);
  assert.equal(navIcons.NAV_ICON_STROKE_WIDTH, 1.8);

  for (const id of allIds) {
    const iconName = navIcons.resolveNavIconName(id);
    assert.notEqual(iconName, "default", `Expected explicit icon mapping for nav item: ${id}`);
  }
});

test("claim CTA availability enforces mode/config/eligibility rules", async () => {
  const claimUx = await loadWorkspaceModule<{
    resolveClaimAvailability: (input: {
      mode: "mock" | "http";
      hasEligiblePayout: boolean;
      hasAuthToken: boolean;
      endpointAvailable?: boolean;
    }) => { enabled: boolean; status: string; reason?: string };
  }>("../../apps/pay-web/app/lib/claim-ux.ts");

  const active = claimUx.resolveClaimAvailability({ mode: "mock", hasEligiblePayout: true, hasAuthToken: false });
  assert.equal(active.enabled, true);
  assert.equal(active.status, "active");

  const missingAuth = claimUx.resolveClaimAvailability({ mode: "http", hasEligiblePayout: true, hasAuthToken: false });
  assert.equal(missingAuth.enabled, false);
  assert.equal(missingAuth.status, "disabled-with-reason");
  assert.equal(missingAuth.reason?.includes("RYVRA_PAY_AUTH_TOKEN"), true);

  const noEligiblePayout = claimUx.resolveClaimAvailability({ mode: "mock", hasEligiblePayout: false, hasAuthToken: true });
  assert.equal(noEligiblePayout.enabled, false);
  assert.equal(noEligiblePayout.reason?.includes("No eligible payout"), true);
});

test("fingerprint claim flow state transitions follow deterministic sequence", async () => {
  const claimUx = await loadWorkspaceModule<{
    transitionClaimUiState: (current: "idle" | "confirming" | "submitting" | "success" | "failure", event: string) =>
      | "idle"
      | "confirming"
      | "submitting"
      | "success"
      | "failure";
  }>("../../apps/pay-web/app/lib/claim-ux.ts");

  let state: "idle" | "confirming" | "submitting" | "success" | "failure" = "idle";
  state = claimUx.transitionClaimUiState(state, "START_CONFIRM");
  assert.equal(state, "confirming");

  state = claimUx.transitionClaimUiState(state, "SUBMIT");
  assert.equal(state, "submitting");

  state = claimUx.transitionClaimUiState(state, "SUCCESS");
  assert.equal(state, "success");

  state = claimUx.transitionClaimUiState(state, "RESET");
  assert.equal(state, "idle");
});

test("claim in-flight lock prevents duplicate submission", async () => {
  const claimUx = await loadWorkspaceModule<{
    createClaimSubmissionLock: () => { acquire: () => boolean; release: () => void; isLocked: () => boolean };
  }>("../../apps/pay-web/app/lib/claim-ux.ts");

  const lock = claimUx.createClaimSubmissionLock();
  assert.equal(lock.acquire(), true);
  assert.equal(lock.isLocked(), true);
  assert.equal(lock.acquire(), false);
  lock.release();
  assert.equal(lock.isLocked(), false);
  assert.equal(lock.acquire(), true);
});

test("claim submit request context and intent carry idempotency key", async () => {
  const claimUx = await loadWorkspaceModule<{
    createClaimIdempotencyKey: (payoutId: string, nonce?: string) => string;
    buildClaimRequestContext: (idempotencyKey: string, requestId: string, correlationId: string) => {
      idempotencyKey: string;
      requestId: string;
      correlationId: string;
    };
    buildClaimIntent: (
      payout: { id: string; amountMinor: number; currency: string; destinationLabel: string; status: string },
      context: { idempotencyKey: string; requestId: string; correlationId: string },
      createdAt?: string,
    ) => { idempotency_key: string; reference_id: string; reason_code: string };
  }>("../../apps/pay-web/app/lib/claim-ux.ts");

  const idempotencyKey = claimUx.createClaimIdempotencyKey("po-123", "fixed-nonce");
  const requestContext = claimUx.buildClaimRequestContext(idempotencyKey, "req-1", "corr-1");

  assert.equal(requestContext.idempotencyKey, idempotencyKey);
  assert.equal(requestContext.requestId, "req-1");
  assert.equal(requestContext.correlationId, "corr-1");

  const intent = claimUx.buildClaimIntent(
    {
      id: "po-123",
      amountMinor: 4200,
      currency: "USD",
      destinationLabel: "Treasury",
      status: "SCHEDULED",
    },
    requestContext,
    "2026-08-09T00:00:00.000Z",
  );

  assert.equal(intent.idempotency_key, idempotencyKey);
  assert.equal(intent.reference_id, "claim:po-123");
  assert.equal(intent.reason_code, "reward_claim");
});

test("claim failure envelope preserves canonical fields for UI rendering", async () => {
  const claimUx = await loadWorkspaceModule<{
    normalizeClaimErrorEnvelope: (
      error: unknown,
      requestId: string,
      correlationId: string,
    ) => { code: string; message: string; retryable: boolean; source: string; requestId: string; correlationId: string };
    formatClaimErrorMeta: (error: { source: string; retryable: boolean }) => string;
  }>("../../apps/pay-web/app/lib/claim-ux.ts");

  const envelope = claimUx.normalizeClaimErrorEnvelope(
    {
      error: {
        code: "pay_upstream_timeout",
        message: "Upstream timeout while creating payment intent",
        retryable: true,
        source: "pay",
      },
    },
    "req-9",
    "corr-9",
  );

  assert.equal(envelope.code, "pay_upstream_timeout");
  assert.equal(envelope.retryable, true);
  assert.equal(envelope.source, "pay");
  assert.equal(envelope.requestId, "req-9");
  assert.equal(envelope.correlationId, "corr-9");
  assert.equal(claimUx.formatClaimErrorMeta(envelope), "Source: pay • Retryable: Yes");
});

test("reduced-motion and aria-label helpers remain accessible", async () => {
  const claimUx = await loadWorkspaceModule<{
    resolveClaimConfirmationDelay: (prefersReducedMotion: boolean) => number;
    getFingerprintAriaLabel: (state: "idle" | "confirming" | "submitting" | "success" | "failure") => string;
  }>("../../apps/pay-web/app/lib/claim-ux.ts");

  assert.equal(claimUx.resolveClaimConfirmationDelay(true), 0);
  assert.equal(claimUx.resolveClaimConfirmationDelay(false) > 0, true);

  assert.equal(claimUx.getFingerprintAriaLabel("idle").includes("confirmation"), true);
  assert.equal(claimUx.getFingerprintAriaLabel("submitting"), "Claim is being submitted");
  assert.equal(claimUx.getFingerprintAriaLabel("success"), "Claim submitted successfully");
});
