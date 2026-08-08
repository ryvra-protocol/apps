import assert from "node:assert/strict";
import { test } from "node:test";
import { loadMarketsIntegrationConfig, loadPayConfig, loadPointsTasksIntegrationConfig } from "../env.ts";

test("pay config keeps safe defaults in mock mode", () => {
  const config = loadPayConfig({});

  assert.equal(config.mode, "mock");
  assert.equal(config.apiBaseUrl, "http://localhost:4000");
});

test("markets http mode fails fast when auth token is missing", () => {
  assert.throws(
    () =>
      loadMarketsIntegrationConfig({
        RYVRA_RUNTIME_MODE: "http",
        RYVRA_API_BASE_URL: "https://markets.example",
      }),
    /RYVRA_MARKETS_AUTH_TOKEN is required in http mode/,
  );
});

test("points/tasks http mode fails fast when auth token is missing", () => {
  assert.throws(
    () =>
      loadPointsTasksIntegrationConfig({
        RYVRA_RUNTIME_MODE: "http",
        RYVRA_API_BASE_URL: "https://points-tasks.example",
      }),
    /RYVRA_POINTS_TASKS_AUTH_TOKEN is required in http mode/,
  );
});

test("pay http mode keeps auth token optional", () => {
  const config = loadPayConfig({
    RYVRA_RUNTIME_MODE: "http",
    RYVRA_API_BASE_URL: "https://pay.example",
  });

  assert.equal(config.mode, "http");
  assert.equal(config.apiBaseUrl, "https://pay.example");
});

test("legacy live mode normalizes to http and still enforces markets auth token", () => {
  assert.throws(
    () =>
      loadMarketsIntegrationConfig({
        RYVRA_RUNTIME_MODE: "live",
        RYVRA_API_BASE_URL: "https://markets.example",
      }),
    /RYVRA_MARKETS_AUTH_TOKEN is required in http mode/,
  );
});

test("invalid env values surface variable-level parse errors", () => {
  assert.throws(
    () =>
      loadPayConfig({
        RYVRA_API_BASE_URL: "not-a-url",
      }),
    /Invalid environment configuration: RYVRA_API_BASE_URL/,
  );
});
