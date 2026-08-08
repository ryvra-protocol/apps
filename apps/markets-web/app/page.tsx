import { Section, themeTokens } from "@ryvra/ui";
import { ErrorState, UnauthorizedState } from "./components/page-states";
import { MarketsOverviewContent } from "./components/markets-overview-content";
import { captureMarketsPageError, createMarketsRuntimeContext } from "./lib/runtime";

export default async function MarketsHomePage() {
  const runtime = createMarketsRuntimeContext("markets-web:dashboard");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Markets Dashboard" description="Access-controlled markets overview surface.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  try {
    const overview = await runtime.marketsClient.getMarketsOverview();

    runtime.logger.info("Loaded markets dashboard overview", {
      mode: runtime.config.mode,
      activityCount: overview.recentActivity.length,
    });

    return (
      <MarketsOverviewContent
        title="Markets Dashboard"
        description="MVP market metrics and recent execution/risk activity."
        mode={runtime.config.mode}
        overview={overview}
      />
    );
  } catch (error) {
    const uiError = captureMarketsPageError(runtime.logger, "/", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Markets Dashboard" description="MVP market metrics and recent execution activity.">
          <ErrorState
            title="Unable to load markets dashboard"
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
