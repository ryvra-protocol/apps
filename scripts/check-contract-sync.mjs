import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REPOSITORY_ROOT = process.cwd();
const MATRIX_PATH = path.join(REPOSITORY_ROOT, "docs/architecture/contract-pin-matrix.json");
const REQUIRED_DOMAINS = new Set(["markets", "pay", "points_tasks"]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoTimestamp(value) {
  if (!isNonEmptyString(value)) {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
}

function isSha(value) {
  return isNonEmptyString(value) && /^[a-f0-9]{40}$/u.test(value);
}

function validateEntrySchema(entry) {
  const schemaErrors = [];

  if (!entry || typeof entry !== "object") {
    return ["Entry must be an object."];
  }

  if (!isNonEmptyString(entry.domain)) {
    schemaErrors.push("Missing required key 'domain'.");
  } else if (!REQUIRED_DOMAINS.has(entry.domain)) {
    schemaErrors.push(`Invalid domain '${entry.domain}'. Expected one of markets, pay, points_tasks.`);
  }

  if (!isNonEmptyString(entry.source_repo)) {
    schemaErrors.push("Missing required key 'source_repo'.");
  } else if (!/^[^/]+\/[^/]+$/u.test(entry.source_repo)) {
    schemaErrors.push(`Invalid source_repo '${entry.source_repo}'. Expected format 'owner/repo'.`);
  }

  if (!isNonEmptyString(entry.source_path)) {
    schemaErrors.push("Missing required key 'source_path'.");
  }

  if (!isSha(entry.pinned_sha)) {
    schemaErrors.push("Missing or invalid key 'pinned_sha' (expected 40-char lowercase hex SHA).");
  }

  if (!Array.isArray(entry.pin_file_references) || entry.pin_file_references.length === 0) {
    schemaErrors.push("Missing or invalid key 'pin_file_references' (expected non-empty array).");
  } else {
    for (const reference of entry.pin_file_references) {
      if (!isNonEmptyString(reference)) {
        schemaErrors.push("pin_file_references must only contain non-empty strings.");
        break;
      }
    }
  }

  if (!isIsoTimestamp(entry.last_verified_at)) {
    schemaErrors.push("Missing or invalid key 'last_verified_at' (expected ISO8601 timestamp).");
  }

  return schemaErrors;
}

function resolveReferencePath(reference) {
  if (path.isAbsolute(reference)) {
    throw new Error(`Pin file reference must be repository-relative, got absolute path '${reference}'.`);
  }

  const absolutePath = path.resolve(REPOSITORY_ROOT, reference);
  const relativePath = path.relative(REPOSITORY_ROOT, absolutePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Pin file reference escapes repository root: '${reference}'.`);
  }

  return absolutePath;
}

async function assertReferenceContainsSha(entry, reference) {
  const filePath = resolveReferencePath(reference);
  const content = await readFile(filePath, "utf8");
  if (!content.includes(entry.pinned_sha)) {
    throw new Error(`Pinned SHA '${entry.pinned_sha}' not found in '${reference}'.`);
  }
}

function computeGitBlobSha(fileBuffer) {
  const headerBuffer = Buffer.from(`blob ${fileBuffer.length}\u0000`, "utf8");
  return createHash("sha1").update(headerBuffer).update(fileBuffer).digest("hex");
}

async function fetchCanonicalSha(sourceRepo, sourcePath) {
  const encodedPath = sourcePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const url = `https://raw.githubusercontent.com/${sourceRepo}/main/${encodedPath}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "ryvra-apps-contract-sync-check",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Raw source lookup failed for ${sourceRepo}/${sourcePath} at ${url}: HTTP ${response.status} ${response.statusText}`,
    );
  }

  const fileBuffer = Buffer.from(await response.arrayBuffer());
  return computeGitBlobSha(fileBuffer);
}

async function run() {
  let matrix;
  try {
    const content = await readFile(MATRIX_PATH, "utf8");
    matrix = JSON.parse(content);
  } catch (error) {
    console.error(
      `[contract-sync-check] FAIL matrix: unable to read ${path.relative(REPOSITORY_ROOT, MATRIX_PATH)} (${error instanceof Error ? error.message : String(error)}).`,
    );
    process.exitCode = 1;
    return;
  }

  if (!Array.isArray(matrix)) {
    console.error("[contract-sync-check] FAIL matrix: expected top-level JSON array.");
    process.exitCode = 1;
    return;
  }

  const seenDomains = new Set();
  const results = [];
  const globalErrors = [];

  for (const entry of matrix) {
    const domain = isNonEmptyString(entry?.domain) ? entry.domain : "<unknown>";
    const errors = validateEntrySchema(entry);

    if (seenDomains.has(domain)) {
      errors.push(`Duplicate domain entry '${domain}'.`);
    }
    seenDomains.add(domain);

    if (errors.length === 0) {
      for (const reference of entry.pin_file_references) {
        try {
          await assertReferenceContainsSha(entry, reference);
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
        }
      }

      try {
        const canonicalSha = await fetchCanonicalSha(entry.source_repo, entry.source_path);
        if (canonicalSha !== entry.pinned_sha) {
          errors.push(
            `Canonical SHA mismatch for ${entry.source_repo}/${entry.source_path}: pinned '${entry.pinned_sha}', canonical '${canonicalSha}'.`,
          );
        }
      } catch (error) {
        errors.push(
          `Unable to verify canonical source for ${entry.source_repo}/${entry.source_path}: ${error instanceof Error ? error.message : String(error)}.`,
        );
      }
    }

    results.push({ domain, errors });
  }

  for (const requiredDomain of REQUIRED_DOMAINS) {
    if (!seenDomains.has(requiredDomain)) {
      globalErrors.push(`Missing required domain '${requiredDomain}' in matrix.`);
    }
  }

  for (const result of results) {
    if (result.errors.length === 0) {
      console.log(`[contract-sync-check] PASS ${result.domain}`);
      continue;
    }

    console.error(`[contract-sync-check] FAIL ${result.domain}`);
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
  }

  if (globalErrors.length > 0) {
    console.error("[contract-sync-check] FAIL matrix");
    for (const error of globalErrors) {
      console.error(`  - ${error}`);
    }
  }

  const failedDomains = results.filter((result) => result.errors.length > 0).length;
  if (failedDomains > 0 || globalErrors.length > 0) {
    console.error(
      `[contract-sync-check] FAILURE summary: ${results.length - failedDomains}/${results.length} domains passed, ${failedDomains} failed.`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(`[contract-sync-check] SUCCESS summary: ${results.length}/${results.length} domains passed.`);
}

await run();
