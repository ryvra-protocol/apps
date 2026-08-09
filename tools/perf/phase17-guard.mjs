import { access, readdir, stat } from "node:fs/promises";
import path from "node:path";

const repositoryRoot = process.cwd();

const appChecks = [
  {
    app: "markets-web",
    bundleBudgetBytes: 2_500_000,
    routeArtifacts: ["page.js", "overview/page.js", "instruments/page.js", "orders/page.js", "positions/page.js", "status/page.js"],
  },
  {
    app: "pay-web",
    bundleBudgetBytes: 2_500_000,
    routeArtifacts: ["page.js", "overview/page.js", "invoices/page.js", "payouts/page.js", "reconciliation/page.js", "status/page.js"],
  },
  {
    app: "points-tasks-web",
    bundleBudgetBytes: 2_500_000,
    routeArtifacts: ["page.js", "overview/page.js", "points/page.js", "tasks/page.js", "status/page.js"],
  },
];

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const resolvedPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(resolvedPath)));
      continue;
    }

    files.push(resolvedPath);
  }

  return files;
}

async function collectBundleStats(chunksDirectoryPath) {
  const jsFiles = (await walkFiles(chunksDirectoryPath)).filter((filePath) => filePath.endsWith(".js"));
  let totalBytes = 0;
  let largestChunkPath = null;
  let largestChunkBytes = 0;

  for (const filePath of jsFiles) {
    const fileStats = await stat(filePath);
    totalBytes += fileStats.size;
    if (fileStats.size > largestChunkBytes) {
      largestChunkBytes = fileStats.size;
      largestChunkPath = filePath;
    }
  }

  return {
    fileCount: jsFiles.length,
    totalBytes,
    largestChunkBytes,
    largestChunkPath,
  };
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function run() {
  const failures = [];

  for (const check of appChecks) {
    const nextBuildPath = path.join(repositoryRoot, "apps", check.app, ".next");
    const chunksPath = path.join(nextBuildPath, "static", "chunks");
    const serverAppPath = path.join(nextBuildPath, "server", "app");

    if (!(await pathExists(chunksPath))) {
      failures.push(`[${check.app}] Missing chunks directory: ${chunksPath}`);
      continue;
    }

    if (!(await pathExists(serverAppPath))) {
      failures.push(`[${check.app}] Missing route output directory: ${serverAppPath}`);
      continue;
    }

    const bundleStats = await collectBundleStats(chunksPath);
    const missingRouteArtifacts = [];

    for (const routeArtifact of check.routeArtifacts) {
      const routeArtifactPath = path.join(serverAppPath, routeArtifact);
      if (!(await pathExists(routeArtifactPath))) {
        missingRouteArtifacts.push(routeArtifact);
      }
    }

    const bundleWithinBudget = bundleStats.totalBytes <= check.bundleBudgetBytes;

    console.log(
      `[perf-guard] ${check.app}: total=${formatBytes(bundleStats.totalBytes)} (${bundleStats.fileCount} chunks), largest=${formatBytes(bundleStats.largestChunkBytes)} (${bundleStats.largestChunkPath ? path.relative(repositoryRoot, bundleStats.largestChunkPath) : "n/a"})`,
    );
    console.log(
      `[perf-guard] ${check.app}: route-artifacts=${missingRouteArtifacts.length === 0 ? "ok" : `missing ${missingRouteArtifacts.join(", ")}`}`,
    );

    if (!bundleWithinBudget) {
      failures.push(
        `[${check.app}] Bundle budget exceeded: ${bundleStats.totalBytes} bytes > ${check.bundleBudgetBytes} bytes`,
      );
    }

    if (missingRouteArtifacts.length > 0) {
      failures.push(`[${check.app}] Missing route artifacts: ${missingRouteArtifacts.join(", ")}`);
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`[perf-guard] ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("[perf-guard] Phase 17 bundle and route build guardrails passed.");
}

await run();
