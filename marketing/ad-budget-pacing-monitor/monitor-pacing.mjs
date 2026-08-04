#!/usr/bin/env node
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
