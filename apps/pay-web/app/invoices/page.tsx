import { Card, Section, themeTokens } from "@ryvra/ui";

export default function PayInvoicesPage() {
  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title="Invoices" description="Placeholder route for invoice lifecycle and collections workflows.">
        <Card title="Coming Soon">
          <p style={{ margin: 0 }}>
            Invoice line-item management, reminder automation, and settlement details will be added in upcoming phases.
          </p>
        </Card>
      </Section>
    </section>
  );
}
