import { loadMarketsConfig } from "@ryvra/config";

export default function MarketsStatusPage() {
  const config = loadMarketsConfig(process.env);

  return (
    <main>
      <h1>Markets Status</h1>
      <pre>{JSON.stringify({ app: config.appId, mode: config.mode, healthy: true }, null, 2)}</pre>
    </main>
  );
}
