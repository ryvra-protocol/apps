import { Card, Section, themeTokens } from "@ryvra/ui";

export default function PayPayoutsPage() {
  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title="Payouts" description="Placeholder route for treasury payouts and disbursement workflows.">
        <Card title="Coming Soon">
          <p style={{ margin: 0 }}>
            Beneficiary setup, payout scheduling, and transfer state monitoring will be introduced with feature pages.
          </p>
        </Card>
      </Section>
    </section>
  );
}
