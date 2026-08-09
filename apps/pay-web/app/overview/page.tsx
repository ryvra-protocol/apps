import { Section, themeTokens } from "@ryvra/ui";
import { ErrorState, UnauthorizedState } from "../components/page-states";
import { PayOverviewContent } from "../components/pay-overview-content";
import { capturePayPageError, createPayRuntimeContext } from "../lib/runtime";
import { loadPayUnifiedBalanceCard } from "../lib/unified-balance";

export default async function PayOverviewPage() {
  const runtime = createPayRuntimeContext("pay-web:overview");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Pay Overview" description="Access-controlled overview view.">
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
        route: "/overview",
        ...(runtime.marketsAccountId ? { accountId: runtime.marketsAccountId } : {}),
      }),
    ]);

    runtime.logger.info("Loaded unified balance for pay overview", {
      accountId: runtime.marketsAccountId ?? "missing",
      state: unifiedBalanceCard.state,
    });

    runtime.logger.info("Loaded pay overview route", {
      mode: runtime.config.mode,
      activityCount: overview.recentActivity.length,
    });

    return (
      <PayOverviewContent
        title="Pay Overview"
        description="Same aggregate model as dashboard, kept as a stable global overview route."
        mode={runtime.config.mode}
        overview={overview}
        unifiedBalanceCard={unifiedBalanceCard}
      />
    );
  } catch (error) {
    const uiError = capturePayPageError(runtime.logger, "/overview", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Pay Overview" description="Shared overview model for pay MVP routes.">
          <ErrorState
            title="Unable to load overview data"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/overview", label: "Retry overview" }}
          />
        </Section>
      </section>
    );
  }
}
