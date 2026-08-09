import { Section, themeTokens } from "@ryvra/ui";
import { ErrorState, UnauthorizedState } from "./components/page-states";
import { PayOverviewContent } from "./components/pay-overview-content";
import { createPayRuntimeContext, capturePayPageError } from "./lib/runtime";
import { loadPayUnifiedBalanceCard } from "./lib/unified-balance";

export default async function PayHomePage() {
  const runtime = createPayRuntimeContext("pay-web:dashboard");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Pay Dashboard" description="Access-controlled pay data surface.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  try {
    const [overview, unifiedBalanceCard] = await Promise.all([
      runtime.payClient.getPayOverview(),
      loadPayUnifiedBalanceCard({
        marketsClient: runtime.marketsClient,
        logger: runtime.logger,
        route: "/",
        ...(runtime.marketsAccountId ? { accountId: runtime.marketsAccountId } : {}),
      }),
    ]);

    runtime.logger.info("Loaded unified balance for pay dashboard", {
      accountId: runtime.marketsAccountId ?? "missing",
      state: unifiedBalanceCard.state,
    });

    runtime.logger.info("Loaded pay dashboard overview", {
      mode: runtime.config.mode,
      activityCount: overview.recentActivity.length,
    });

    return (
      <PayOverviewContent
        title="Pay Dashboard"
        description="MVP finance metrics and recent invoice/payout/reconciliation activity."
        mode={runtime.config.mode}
        overview={overview}
        unifiedBalanceCard={unifiedBalanceCard}
      />
    );
  } catch (error) {
    const uiError = capturePayPageError(runtime.logger, "/", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Pay Dashboard" description="MVP finance metrics and recent activity.">
          <ErrorState
            title="Unable to load dashboard data"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/", label: "Retry dashboard" }}
          />
        </Section>
      </section>
    );
  }
}
