import { Card, Section, themeTokens } from "@ryvra/ui";

export default function MarketsPositionsPage() {
  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title="Positions" description="Placeholder route for portfolio positions and risk context.">
        <Card title="Coming Soon">
          <p style={{ margin: 0 }}>
            Position monitoring, exposure views, and hedge actions are planned for upcoming feature milestones.
          </p>
        </Card>
      </Section>
    </section>
  );
}
