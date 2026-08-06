import { Card, Section, themeTokens } from "@ryvra/ui";

export default function PayReconciliationPage() {
  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title="Reconciliation" description="Placeholder route for ledger checks and settlement matching.">
        <Card title="Coming Soon">
          <p style={{ margin: 0 }}>
            Reconciliation rule sets, mismatch alerts, and audit trails will be layered in as feature work starts.
          </p>
        </Card>
      </Section>
    </section>
  );
}
