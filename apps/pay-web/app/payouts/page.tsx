import type { PayListRequest, PayoutDto, PayoutFilters } from "@ryvra/domain-payments";
import { Card, Section, themeTokens } from "@ryvra/ui";
import { ClaimFingerprintCardClient } from "../components/claim-fingerprint-card-client";
import { ModeBadge } from "../components/mode-badge";
import { EmptyState, ErrorState, UnauthorizedState } from "../components/page-states";
import { PayoutsTableClient } from "../components/payouts-table-client";
import { formatCurrencyMinor } from "../lib/format";
import { resolveClaimAvailability, type ClaimPayoutCandidate } from "../lib/claim-ux";
import {
  parseDateRange,
  parsePage,
  parsePageSize,
  parsePayoutDestinationType,
  parsePayoutStatus,
  parseSortDirection,
  type RouteSearchParams,
} from "../lib/search-params";
import { capturePayPageError, createPayRuntimeContext } from "../lib/runtime";

interface PayPayoutsPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

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

  try {
    const request = buildPayoutRequest(searchParams);
    const [payoutList, summary] = await Promise.all([runtime.payClient.listPayouts(request), runtime.payClient.getPayoutSummary()]);

    const claimCandidate = resolveClaimPayoutCandidate(payoutList.items);
    const claimAvailability = resolveClaimAvailability({
      mode: runtime.config.mode,
      hasEligiblePayout: Boolean(claimCandidate),
      hasAuthToken: Boolean(getOptionalEnvValue("RYVRA_PAY_AUTH_TOKEN")),
      endpointAvailable: runtime.config.mode === "mock" || runtime.config.mode === "http",
    });

    runtime.logger.info("Loaded payouts data", {
      mode: runtime.config.mode,
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

          <ClaimFingerprintCardClient mode={runtime.config.mode} payout={claimCandidate} availability={claimAvailability} />

          <PayoutsTableClient items={payoutList.items} pagination={payoutList.pagination} />

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
