#!/usr/bin/env node
// KPI Dashboard (Marketing) — CAC and MQL→SQL progression from a GA export
// and a CRM stage export. See README.md before running.

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

function normStage(s) {
  return (s || "").trim().toLowerCase();
}

async function main() {
  const [, , gaPath, crmPath] = process.argv;
  if (!gaPath || !crmPath) {
    console.error("Usage: node kpi-report.mjs <ga_export.csv> <crm_export.csv>");
    process.exit(1);
  }

  const ga = parseCsv(await readFile(gaPath, "utf8"));
  const crm = parseCsv(await readFile(crmPath, "utf8"));

  const totalSpend = ga.reduce((sum, r) => sum + (Number(r.spend) || 0), 0);
  const totalSessions = ga.reduce((sum, r) => sum + (Number(r.sessions) || 0), 0);

  const mqlCount = crm.filter((r) => normStage(r.stage) === "mql").length;
  const sqlCount = crm.filter((r) => normStage(r.stage) === "sql").length;
  const customerCount = crm.filter((r) => normStage(r.stage) === "customer").length;
  // "stage" is a CURRENT-stage snapshot, not a history — a lead that has
  // already progressed past SQL to customer would otherwise be invisible
  // to a strict MQL-count / SQL-count ratio. Counting SQL + customer as
  // "progressed past MQL" is a closer approximation, though still not a
  // true cohort conversion rate (that needs stage-history data this export
  // doesn't have).
  const progressedPastMql = sqlCount + customerCount;

  const cac = customerCount ? totalSpend / customerCount : null;
  const mqlToSql = mqlCount ? (progressedPastMql / mqlCount) * 100 : null;

  const md = [
    "# Marketing KPI Report",
    "",
    `- **Total spend:** $${totalSpend.toLocaleString()}`,
    `- **Total sessions:** ${totalSessions.toLocaleString()}`,
    `- **New customers:** ${customerCount}`,
    `- **CAC:** ${cac === null ? "n/a (no customers in period)" : "$" + cac.toFixed(2)}`,
    `- **MQL → SQL+ progression:** ${mqlToSql === null ? "n/a (no MQLs in period)" : mqlToSql.toFixed(1) + "%"} (${progressedPastMql} at SQL or beyond / ${mqlCount} MQL) — a current-stage snapshot, not a true cohort conversion rate.`,
  ].join("\n");

  const json = { total_spend: totalSpend, total_sessions: totalSessions, customer_count: customerCount, cac, mql_count: mqlCount, sql_count: sqlCount, progressed_past_mql: progressedPastMql, mql_to_sql_plus_pct: mqlToSql };

  await writeFile("kpi-report.md", md + "\n", "utf8");
  await writeFile("kpi-report.json", JSON.stringify(json, null, 2), "utf8");

  console.log(md);
  console.log("\nWrote kpi-report.md and kpi-report.json");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
