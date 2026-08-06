import { Card, Section, themeTokens } from "@ryvra/ui";

export default function PointsActivityPage() {
  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title="Activity" description="Placeholder route for points ledger activity and reward event timelines.">
        <Card title="Coming Soon">
          <p style={{ margin: 0 }}>
            Activity feeds, event attribution, and partner settlement context will be introduced with feature pages.
          </p>
        </Card>
      </Section>
    </section>
  );
}
