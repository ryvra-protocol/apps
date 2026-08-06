import { Card, Section, themeTokens } from "@ryvra/ui";

export default function MarketsInstrumentsPage() {
  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title="Instruments" description="Placeholder route for instruments catalog and discovery workflows.">
        <Card title="Coming Soon">
          <p style={{ margin: 0 }}>
            Instrument definitions, metadata filters, and listing controls will be added in future feature phases.
          </p>
        </Card>
      </Section>
    </section>
  );
}
