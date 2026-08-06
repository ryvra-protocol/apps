import { loadPointsTasksConfig } from "@ryvra/config";

export default function PointsTasksStatusPage() {
  const config = loadPointsTasksConfig(process.env);

  return (
    <main>
      <h1>Points/Tasks Status</h1>
      <pre>{JSON.stringify({ app: config.appId, mode: config.mode, healthy: true }, null, 2)}</pre>
    </main>
  );
}
