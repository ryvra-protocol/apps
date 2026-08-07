import { createApiClient, createMockTransport } from "@ryvra/api-client";
import { createStubAuthGuard, Role, type Session } from "@ryvra/auth";
import { buildDeepLink, loadPayConfig, parseDeepLink } from "@ryvra/config";
import type { InvoiceDto } from "@ryvra/domain-payments";
import { createConsoleLogger } from "@ryvra/observability";
import { Button, Card, DataTable, Section, themeTokens } from "@ryvra/ui";

interface PayHomePageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

function hasContextParams(value: ReturnType<typeof parseDeepLink>): boolean {
  return Object.values(value.params).some((param) => typeof param === "string" && param.length > 0);
}

export default async function PayHomePage({ searchParams }: PayHomePageProps) {
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
  const deepLinkContext = parseDeepLink(searchParams);
  const contextAvailable = hasContextParams(deepLinkContext);

  const crossAppLinks = [
    {
      label: "Open related order in Markets",
      href: buildDeepLink({
        product: "markets",
        path: "/orders",
        ref: "pay",
        entity: "invoice",
        id: typedInvoiceExample?.id ?? "invoice-fallback",
        ctx: "handoff=collections",
      }),
    },
    {
      label: "Open points task queue",
      href: buildDeepLink({
        product: "points",
        path: "/tasks",
        ref: "pay",
        entity: "invoice",
        id: typedInvoiceExample?.id ?? "invoice-fallback",
        ctx: "queue=follow-up",
      }),
    },
  ];

  logger.info("Loaded pay unified shell dashboard", {
    authorized: authDecision.allowed,
    invoiceCount: invoices.length,
    deepLinkValid: deepLinkContext.valid,
  });

  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title="Pay Dashboard" description="Unified shell entry for invoicing and payouts across products.">
        <Card title="Access State">
          <p style={{ margin: 0 }}>Authorized: {String(authDecision.allowed)}</p>
          <p style={{ marginBottom: 0, color: themeTokens.color.textMuted }}>Runtime mode: {config.mode}</p>
        </Card>

        <Card title="Invoice Boundary">
          <p style={{ marginTop: 0 }}>Sample invoice id: {typedInvoiceExample?.id ?? "n/a"}</p>
          <Button type="button" variant="secondary">
            Create Follow-up
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

        <Card title="Cross-App Workflow Links">
          <p style={{ marginTop: 0 }}>Jump into trading or rewards flows while preserving work context.</p>
          <ul style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: "0.5rem" }}>
            {crossAppLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} style={{ color: themeTokens.color.primary }}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Incoming Deep-Link Context">
          {deepLinkContext.valid ? (
            contextAvailable ? (
              <pre style={{ margin: 0 }}>{JSON.stringify(deepLinkContext.params, null, 2)}</pre>
            ) : (
              <p style={{ margin: 0 }}>No inbound deep-link context detected.</p>
            )
          ) : (
            <p style={{ margin: 0 }}>Deep-link parse error: {deepLinkContext.errors.join("; ")}</p>
          )}
        </Card>
      </Section>
    </section>
  );
}
