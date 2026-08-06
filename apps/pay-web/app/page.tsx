import { createApiClient, createMockTransport } from "@ryvra/api-client";
import { createStubAuthGuard, Role, type Session } from "@ryvra/auth";
import { loadPayConfig } from "@ryvra/config";
import type { InvoiceDto } from "@ryvra/domain-payments";
import { createConsoleLogger } from "@ryvra/observability";
import { Button, Card, DataTable, Section } from "@ryvra/ui";

export default async function PayHomePage() {
  const config = loadPayConfig(process.env);
  const logger = createConsoleLogger("pay-web");
  const authGuard = createStubAuthGuard([Role.Member, Role.Admin]);
  const session: Session = {
    user: { id: "local-member", roles: [Role.Member] },
    issuedAt: new Date().toISOString(),
  };
  const authDecision = authGuard.authorize(session);

  const api = createApiClient({
    mode: config.mode,
    baseUrl: config.apiBaseUrl,
    transport: createMockTransport(),
  });

  const invoices = await api.pay.listInvoices();
  const typedInvoiceExample: InvoiceDto | undefined = invoices[0];

  logger.info("Loaded pay scaffold page", {
    authorized: authDecision.allowed,
    invoiceCount: invoices.length,
  });

  return (
    <main style={{ display: "grid", gap: "1rem" }}>
      <Section title="Pay Platform" description="Scaffolded Pay app shell using shared package boundaries.">
        <Card title="Access State">
          <p>Authorized: {String(authDecision.allowed)}</p>
        </Card>

        <Card title="Invoice Boundary">
          <p>Sample invoice id: {typedInvoiceExample?.id ?? "n/a"}</p>
          <Button type="button" variant="secondary">
            Shared UI Primitive
          </Button>
        </Card>

        <Card title="Invoices">
          <DataTable
            columns={[
              { key: "id", header: "Invoice" },
              { key: "amountMinor", header: "Amount (minor units)" },
              { key: "status", header: "Status" },
            ]}
            rows={invoices}
          />
        </Card>
      </Section>
    </main>
  );
}
