#!/usr/bin/env node
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
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: node monitor-pacing.mjs <spend.csv> [--tolerance-pct=15]");
    process.exit(1);
  }
  const flag = process.argv.find((a) => a.startsWith("--tolerance-pct="));
  const tolerance = flag ? Number(flag.split("=")[1]) : 15;

  const rows = parseCsv(await readFile(input, "utf8"));
  const results = rows.map((r) => {
    const expectedPct = Number(r.day_of_month) / Number(r.days_in_month);
    const expectedSpend = expectedPct * Number(r.monthly_budget);
    const actualSpend = Number(r.month_to_date_spend) || 0;
    const deviationPct = expectedSpend > 0 ? ((actualSpend - expectedSpend) / expectedSpend) * 100 : 0;
    let status = "on_pace";
    if (deviationPct > tolerance) status = "over_pace";
    else if (deviationPct < -tolerance) status = "under_pace";
    return { campaign: r.campaign, expected_spend: expectedSpend.toFixed(0), actual_spend: actualSpend.toFixed(0), deviation_pct: deviationPct.toFixed(1), status };
  });

  const md = ["# Ad Budget Pacing Report", "", "| Campaign | Expected | Actual | Deviation | Status |", "|---|---|---|---|---|",
    ...results.map((r) => `| ${r.campaign} | $${r.expected_spend} | $${r.actual_spend} | ${r.deviation_pct}% | ${r.status} |`)].join("\n");

  await writeFile("pacing-report.md", md + "\n", "utf8");
  console.log(`${results.filter((r) => r.status !== "on_pace").length} of ${results.length} campaigns off pace.`);
  console.log("Wrote pacing-report.md");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
