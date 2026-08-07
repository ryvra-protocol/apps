import { Card, Section, themeTokens } from "@ryvra/ui";

export default function MarketsOrdersPage() {
  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title="Orders" description="Placeholder route for order management and execution operations.">
        <Card title="Coming Soon">
          <p style={{ margin: 0 }}>
            Order lifecycle views and order controls will be introduced once feature pages are enabled.
          </p>
        </Card>
      </Section>
    </section>
  );
}
