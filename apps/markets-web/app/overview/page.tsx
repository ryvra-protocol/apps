import { Section, themeTokens } from "@ryvra/ui";
import { ErrorState, UnauthorizedState } from "../components/page-states";
import { MarketsOverviewContent } from "../components/markets-overview-content";
import { captureMarketsPageError, createMarketsRuntimeContext } from "../lib/runtime";

export default async function MarketsOverviewPage() {
  const runtime = createMarketsRuntimeContext("markets-web:overview");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Markets Overview" description="Access-controlled markets overview surface.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  try {
    const overview = await runtime.marketsClient.getMarketsOverview();

    runtime.logger.info("Loaded markets overview route", {
      mode: runtime.config.mode,
      activityCount: overview.recentActivity.length,
    });

    return (
      <MarketsOverviewContent
        title="Markets Overview"
        description="Shared overview route with dashboard-consistent market metrics and activity."
        mode={runtime.config.mode}
        overview={overview}
      />
    );
  } catch (error) {
    const uiError = captureMarketsPageError(runtime.logger, "/overview", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Markets Overview" description="Shared overview route with dashboard-consistent market metrics and activity.">
          <ErrorState
            title="Unable to load markets overview"
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
