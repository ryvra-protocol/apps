import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { InsightModuleCard, InsightTrendBars, InsightWindowSelector } from "./PortfolioInsights";

test("insight module card renders loading/empty/error/success states", () => {
  const loading = renderToStaticMarkup(<InsightModuleCard title="Insights" state="loading" />);
  assert.match(loading, /Loading insight module/);

  const empty = renderToStaticMarkup(<InsightModuleCard title="Insights" state="empty" />);
  assert.match(empty, /No insight data is available/);

  const error = renderToStaticMarkup(<InsightModuleCard title="Insights" state="error" errorMessage="boom" />);
  assert.match(error, /boom/);

  const success = renderToStaticMarkup(
    <InsightModuleCard title="Insights" state="success">
      <p>ok</p>
    </InsightModuleCard>,
  );
  assert.match(success, /ok/);
});

test("window selector preserves selection and exposes fallback copy", () => {
  const markup = renderToStaticMarkup(
    <InsightWindowSelector
      label="Insight window"
      selectedWindow="7d"
      options={[
        { window: "24h", href: "/points?window=24h" },
        { window: "7d", href: "/points?window=7d" },
        { window: "30d", disabled: true, disabledReason: "unavailable" },
      ]}
      fallbackMessage="30d is unavailable."
    />,
  );

  assert.match(markup, /aria-current="page"[^>]*>7D/);
  assert.match(markup, /aria-disabled="true"/);
  assert.match(markup, /30d is unavailable/);
});

test("trend bars render compact visual summary and empty fallback", () => {
  const populated = renderToStaticMarkup(
    <InsightTrendBars
      ariaLabel="Trend"
      points={[
        { id: "a", label: "A", value: 10, valueLabel: "+10" },
        { id: "b", label: "B", value: 4, valueLabel: "+4" },
      ]}
    />,
  );
  assert.match(populated, /aria-label="Trend"/);
  assert.match(populated, /\+10/);

  const empty = renderToStaticMarkup(<InsightTrendBars ariaLabel="Trend" points={[]} />);
  assert.match(empty, /Trend data is unavailable/);
});
