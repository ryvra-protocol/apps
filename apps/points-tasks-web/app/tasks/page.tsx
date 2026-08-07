import { Card, Section, themeTokens } from "@ryvra/ui";

export default function PointsTasksPage() {
  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title="Tasks" description="Placeholder route for task queue, claims, and completion workflows.">
        <Card title="Coming Soon">
          <p style={{ margin: 0 }}>
            Task assignment, verification, and reward-triggering actions will be delivered in upcoming feature phases.
          </p>
        </Card>
      </Section>
    </section>
  );
}
