import type { PayListRequest, PayoutDto, PayoutFilters } from "@ryvra/domain-payments";
import { canAccessWorkspaceCapability, describeWorkspaceCapabilityRequirement } from "@ryvra/auth";
import { evaluateRoutePermission, resolveRoutePermissionMeta } from "@ryvra/config";
import {
  Card,
  ComplianceEvidencePanel,
  DelegationProvenanceChips,
  OperationTimelineCard,
  PolicyLinksCard,
  Section,
  TrustDisclosureCard,
  themeTokens,
} from "@ryvra/ui";
import nextDynamic from "next/dynamic";
import { ModeBadge } from "../components/mode-badge";
import { EmptyState, ErrorState, PermissionDeniedState, UnauthorizedState } from "../components/page-states";
import { PayoutsTableClient } from "../components/payouts-table-client";
import { buildPayoutDelegationContext } from "../lib/delegation-context";
import { formatCurrencyMinor } from "../lib/format";
import { resolveClaimAvailability, type ClaimPayoutCandidate } from "../lib/claim-ux";
import { buildPayoutEvidenceReferences, buildPayoutTimelineStages, resolvePayoutRetryable } from "../lib/trust-compliance";
import {
  parseAccountId,
  parseDateRange,
  parsePage,
  parsePageSize,
  parsePayoutDestinationType,
  parsePayoutStatus,
  parseSortDirection,
  parseWorkspaceId,
  type RouteSearchParams,
} from "../lib/search-params";
import { capturePayPageError, createPayRuntimeContext } from "../lib/runtime";

interface PayPayoutsPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

const ClaimFingerprintCardClient = nextDynamic(
  () => import("../components/claim-fingerprint-card-client").then((module) => module.ClaimFingerprintCardClient),
  {
    loading: () => (
      <Card title="Claim">
        <p style={{ marginTop: 0, marginBottom: themeTokens.spacing.xs, color: themeTokens.color.textMuted }}>
          Loading claim module…
        </p>
        <div style={{ display: "grid", gap: themeTokens.spacing.sm }}>
          <div style={{ height: "1rem", width: "45%", borderRadius: themeTokens.radius.sm, background: themeTokens.color.surfaceMuted }} />
          <div style={{ height: "1rem", width: "70%", borderRadius: themeTokens.radius.sm, background: themeTokens.color.surfaceMuted }} />
        </div>
      </Card>
    ),
  },
);

function getOptionalEnvValue(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function buildPayoutRequest(searchParams: RouteSearchParams): PayListRequest<PayoutFilters> {
  const status = parsePayoutStatus(searchParams);
  const destinationType = parsePayoutDestinationType(searchParams);
  const dateRange = parseDateRange(searchParams);

  const filters: PayoutFilters = {
    ...(status ? { status } : {}),
    ...(destinationType ? { destinationType } : {}),
    ...(dateRange ? { dateRange } : {}),
  };

  return {
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
    pagination: {
      page: parsePage(searchParams),
      pageSize: parsePageSize(searchParams, 20),
    },
    sort: {
      field: "createdAt",
      direction: parseSortDirection(searchParams),
    },
  };
}

function resolveClaimPayoutCandidate(items: PayoutDto[]): ClaimPayoutCandidate | null {
  const preferred = items.find((item) => item.status === "SCHEDULED") ?? items.find((item) => item.status === "PROCESSING");

  if (!preferred) {
    return null;
  }

  return {
    id: preferred.id,
    amountMinor: preferred.amountMinor,
    currency: preferred.currency,
    destinationLabel: preferred.destinationLabel,
    status: preferred.status,
  };
}

function resolveTrustPayout(items: PayoutDto[]): PayoutDto | null {
  return items.find((item) => item.status === "SCHEDULED") ?? items.find((item) => item.status === "PROCESSING") ?? items[0] ?? null;
}

export default async function PayPayoutsPage({ searchParams }: PayPayoutsPageProps) {
  const runtime = createPayRuntimeContext("pay-web:payouts");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Payouts" description="Access-controlled payout operations view.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  const routePermission = evaluateRoutePermission(resolveRoutePermissionMeta("pay", "/payouts"), runtime.sessionRoleClaims);
  if (!routePermission.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Payouts" description="Payout tracking with typed list and summary boundaries.">
          <PermissionDeniedState message={routePermission.reason ?? "You do not have permission to view payouts."} />
        </Section>
      </section>
    );
  }

  try {
    const accountId = parseAccountId(searchParams) ?? runtime.marketsAccountId ?? "acct-core-1";
    const workspaceId = parseWorkspaceId(searchParams) ?? "workspace-core-1";
    const canOperate = canAccessWorkspaceCapability(runtime.workspaceRole, "operate");
    const operateDeniedReason = describeWorkspaceCapabilityRequirement("operate", runtime.workspaceRole, "Claim submission");
    const panelDeniedReason = describeWorkspaceCapabilityRequirement("operate", runtime.workspaceRole, "Operational evidence panels");
    const request = buildPayoutRequest(searchParams);
    const [payoutList, summary] = await Promise.all([runtime.payClient.listPayouts(request), runtime.payClient.getPayoutSummary()]);

    const claimCandidate = resolveClaimPayoutCandidate(payoutList.items);
    const trustPayout = resolveTrustPayout(payoutList.items);
    const payoutTimelineStages = buildPayoutTimelineStages(trustPayout);
    const claimAvailability = resolveClaimAvailability({
      mode: runtime.config.mode,
      hasEligiblePayout: Boolean(claimCandidate),
      hasAuthToken: Boolean(getOptionalEnvValue("RYVRA_PAY_AUTH_TOKEN")),
      endpointAvailable: runtime.config.mode === "mock" || runtime.config.mode === "http",
    });

    runtime.logger.info("Loaded payouts data", {
      mode: runtime.config.mode,
      accountId,
      workspaceId,
      role: runtime.workspaceRole.role,
      payoutCount: payoutList.items.length,
      totalPayouts: summary.scheduledCount + summary.processingCount + summary.completedCount + summary.failedCount,
      claimEnabled: claimAvailability.enabled,
      claimCandidateId: claimCandidate?.id,
    });

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Payouts" description="Payout tracking with typed list and summary boundaries.">
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <ModeBadge mode={runtime.config.mode} />
          </div>

          <Card title="Runtime context">
            <p style={{ marginTop: 0, marginBottom: themeTokens.spacing.xs }}>
              Account: <strong>{accountId}</strong>
            </p>
            <p style={{ margin: 0 }}>
              Workspace: <strong>{workspaceId}</strong>
            </p>
            <p style={{ marginTop: themeTokens.spacing.xs, marginBottom: 0 }}>
              Role: <strong>{runtime.workspaceRole.label}</strong>
            </p>
          </Card>

          <div style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <Card title="Scheduled">
              <p style={{ margin: 0 }}>{summary.scheduledCount}</p>
            </Card>
            <Card title="Processing">
              <p style={{ margin: 0 }}>{summary.processingCount}</p>
            </Card>
            <Card title="Completed">
              <p style={{ margin: 0 }}>{summary.completedCount}</p>
            </Card>
            <Card title="Failed">
              <p style={{ margin: 0 }}>{summary.failedCount}</p>
            </Card>
            <Card title="Payout volume">
              <p style={{ margin: 0 }}>{formatCurrencyMinor(summary.totalAmountMinor, summary.currency)}</p>
            </Card>
          </div>

          <TrustDisclosureCard
            title="Claim and payout trust notice"
            confirmationText="Fingerprint-style confirmation is a local UI confirmation step and does not capture biometric data."
            retryText="Retry only when an operation is marked retryable in the error details."
            processingText="Payout and claim processing may continue after this page refreshes; check timeline and status routes for updates."
          />

          <ClaimFingerprintCardClient
            mode={runtime.config.mode}
            payout={claimCandidate}
            availability={claimAvailability}
            accountId={accountId}
            workspaceId={workspaceId}
            canOperate={canOperate}
            operateDeniedReason={operateDeniedReason}
          />

          <Card title="Delegated operation provenance">
            <DelegationProvenanceChips context={trustPayout ? buildPayoutDelegationContext(trustPayout) : { available: false }} />
          </Card>

          {canOperate ? (
            <>
              <OperationTimelineCard
                title="Latest payout operation timeline"
                state={payoutTimelineStages.length > 0 ? "success" : "empty"}
                emptyMessage="No payout timeline is available for the current filters."
                stages={payoutTimelineStages}
              />

              <ComplianceEvidencePanel
                title="Latest payout compliance evidence"
                summaryLabel="Details"
                sourceSystem="pay"
                retryable={resolvePayoutRetryable(trustPayout)}
                references={buildPayoutEvidenceReferences(trustPayout)}
                lastUpdated={trustPayout?.completedAt ?? trustPayout?.scheduledFor ?? trustPayout?.createdAt}
              />
            </>
          ) : (
            <Card title="Operational evidence">
              <p style={{ margin: 0 }}>{panelDeniedReason}</p>
            </Card>
          )}

          <PolicyLinksCard
            title="Payout policy and help"
            description="Use these references for payout processing expectations and diagnostics."
            links={[
              { href: "/status", label: "View pay status diagnostics" },
              { href: "/reconciliation", label: "Review reconciliation exceptions" },
              { href: "/overview", label: "Open pay operational overview" },
            ]}
          />

          <PayoutsTableClient items={payoutList.items} pagination={payoutList.pagination} currentUserId={runtime.sessionUserId} />

          {payoutList.items.length === 0 ? (
            <EmptyState title="No payouts" description="No payouts matched the current filters." actionLink={{ href: "/payouts", label: "Reset filters" }} />
          ) : null}
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = capturePayPageError(runtime.logger, "/payouts", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Payouts" description="Payout tracking with typed list and summary boundaries.">
          <ErrorState
            title="Unable to load payouts"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/payouts", label: "Retry payouts" }}
          />
        </Section>
      </section>
    );
  }
}
