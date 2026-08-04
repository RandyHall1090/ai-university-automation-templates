#!/usr/bin/env node
// KPI Dashboard (Marketing) — CAC and MQL→SQL conversion from a GA export
// and a CRM stage export. See README.md before running.

import { readFile, writeFile } from "node:fs/promises";

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row = {};
    headers.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row;
  });
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

  const mqlCount = crm.filter((r) => r.stage === "MQL").length;
  const sqlCount = crm.filter((r) => r.stage === "SQL").length;
  const customerCount = crm.filter((r) => r.stage === "customer").length;

  const cac = customerCount ? totalSpend / customerCount : null;
  const mqlToSql = mqlCount ? (sqlCount / mqlCount) * 100 : null;

  const md = [
    "# Marketing KPI Report",
    "",
    `- **Total spend:** $${totalSpend.toLocaleString()}`,
    `- **Total sessions:** ${totalSessions.toLocaleString()}`,
    `- **New customers:** ${customerCount}`,
    `- **CAC:** ${cac === null ? "n/a (no customers in period)" : "$" + cac.toFixed(2)}`,
    `- **MQL → SQL conversion:** ${mqlToSql === null ? "n/a (no MQLs in period)" : mqlToSql.toFixed(1) + "%"} (${sqlCount} SQL / ${mqlCount} MQL)`,
  ].join("\n");

  const json = { total_spend: totalSpend, total_sessions: totalSessions, customer_count: customerCount, cac, mql_count: mqlCount, sql_count: sqlCount, mql_to_sql_pct: mqlToSql };

  await writeFile("kpi-report.md", md + "\n", "utf8");
  await writeFile("kpi-report.json", JSON.stringify(json, null, 2), "utf8");

  console.log(md);
  console.log("\nWrote kpi-report.md and kpi-report.json");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
