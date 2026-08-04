#!/usr/bin/env node
// KPI Dashboard Builder (Financial) — runway, burn rate, AR aging, budget
// vs. actual, from raw exports. Read-only — report generation only, no
// writes to any accounting system. See README.md before running.

import { readFile, writeFile } from "node:fs/promises";

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  const s = text.replace(/\r\n/g, "\n");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const clean = rows.filter((r) => !(r.length === 1 && r[0] === ""));
  const headers = clean[0].map((h) => h.trim());
  return clean.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = (cells[i] ?? "").trim()));
    return obj;
  });
}

function daysUntil(dateStr) {
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

async function main() {
  const [, , finPath, arPath] = process.argv;
  if (!finPath || !arPath) {
    console.error("Usage: node financial-kpi.mjs <financials.csv> <receivables.csv>");
    process.exit(1);
  }

  const financials = parseCsv(await readFile(finPath, "utf8"));
  const receivables = parseCsv(await readFile(arPath, "utf8"));

  const latest = financials[financials.length - 1];
  const trailing3 = financials.slice(-3);
  const avgBurn = trailing3.reduce((sum, m) => sum + (Number(m.expenses) || 0), 0) / trailing3.length;
  const runwayMonths = avgBurn > 0 ? Number(latest.cash_balance) / avgBurn : null;

  const unpaid = receivables.filter((r) => String(r.paid).toLowerCase() !== "true");
  const buckets = { current: 0, days_30: 0, days_60: 0, days_90_plus: 0 };
  for (const inv of unpaid) {
    const overdue = -daysUntil(inv.due_date);
    const amt = Number(inv.amount) || 0;
    if (overdue <= 0) buckets.current += amt;
    else if (overdue <= 30) buckets.days_30 += amt;
    else if (overdue <= 60) buckets.days_60 += amt;
    else buckets.days_90_plus += amt;
  }

  const budgetVariance = financials.map((m) => ({
    month: m.month,
    budget: Number(m.budget) || 0,
    actual: Number(m.expenses) || 0,
    variance: (Number(m.budget) || 0) - (Number(m.expenses) || 0),
  }));

  const md = [
    "# Financial KPI Report",
    "",
    `- **Current cash:** $${Number(latest.cash_balance).toLocaleString()}`,
    `- **Avg monthly burn (trailing 3mo):** $${avgBurn.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
    `- **Runway:** ${runwayMonths === null ? "n/a" : runwayMonths.toFixed(1) + " months"}`,
    "",
    "## AR Aging (unpaid invoices)",
    "",
    `- Current: $${buckets.current.toLocaleString()}`,
    `- 1–30 days: $${buckets.days_30.toLocaleString()}`,
    `- 31–60 days: $${buckets.days_60.toLocaleString()}`,
    `- 90+ days: $${buckets.days_90_plus.toLocaleString()}`,
    "",
    "## Budget vs. Actual",
    "",
    "| Month | Budget | Actual | Variance |",
    "|---|---|---|---|",
    ...budgetVariance.map((m) => `| ${m.month} | $${m.budget.toLocaleString()} | $${m.actual.toLocaleString()} | $${m.variance.toLocaleString()} |`),
  ].join("\n");

  const json = { cash_balance: Number(latest.cash_balance), avg_monthly_burn: avgBurn, runway_months: runwayMonths, ar_aging: buckets, budget_variance: budgetVariance };

  await writeFile("financial-kpi-report.md", md + "\n", "utf8");
  await writeFile("financial-kpi-report.json", JSON.stringify(json, null, 2), "utf8");

  console.log(md);
  console.log("\nWrote financial-kpi-report.md and .json");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
