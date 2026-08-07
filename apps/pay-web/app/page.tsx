import { Section, themeTokens } from "@ryvra/ui";
import { ErrorState, UnauthorizedState } from "./components/page-states";
import { PayOverviewContent } from "./components/pay-overview-content";
import { createPayRuntimeContext, capturePayPageError } from "./lib/runtime";

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
    const overview = await runtime.payClient.getPayOverview();

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
