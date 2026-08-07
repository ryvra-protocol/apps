import { loadPointsTasksConfig } from "@ryvra/config";
import { Card, Section, themeTokens } from "@ryvra/ui";

export default function PointsTasksStatusPage() {
  const config = loadPointsTasksConfig(process.env);

  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section
        title="Points & Tasks Status"
        description="Production-safe health placeholder for the unified shell foundation."
      >
        <Card title="Service Snapshot">
          <pre style={{ margin: 0 }}>{JSON.stringify({ app: config.appId, mode: config.mode, healthy: true }, null, 2)}</pre>
        </Card>
      </Section>
    </section>
  );
}
