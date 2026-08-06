import { Card, Section, themeTokens } from "@ryvra/ui";

export default function PayOverviewPage() {
  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title="Platform Overview" description="Shared shell overview route for the Pay product surface.">
        <Card title="Overview Placeholder">
          <p style={{ margin: 0 }}>
            This route keeps global navigation stable while dedicated finance workflows are implemented in later phases.
          </p>
        </Card>
      </Section>
    </section>
  );
}
