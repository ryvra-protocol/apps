import { loadPayConfig } from "@ryvra/config";

export default function PayStatusPage() {
  const config = loadPayConfig(process.env);

  return (
    <main>
      <h1>Pay Status</h1>
      <pre>{JSON.stringify({ app: config.appId, mode: config.mode, healthy: true }, null, 2)}</pre>
    </main>
  );
}
