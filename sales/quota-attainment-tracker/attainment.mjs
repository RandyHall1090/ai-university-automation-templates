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
  const [, , dealsPath, quotasPath] = process.argv;
  if (!dealsPath || !quotasPath) {
    console.error("Usage: node attainment.mjs <closed-won.csv> <quotas.csv>");
    process.exit(1);
  }
  const deals = parseCsv(await readFile(dealsPath, "utf8"));
  const quotas = parseCsv(await readFile(quotasPath, "utf8"));

  const closedByRep = {};
  for (const d of deals) closedByRep[d.rep] = (closedByRep[d.rep] || 0) + (Number(d.amount) || 0);

  const rows = quotas.map((q) => {
    const closed = closedByRep[q.rep] || 0;
    const pct = (closed / (Number(q.quota) || 1)) * 100;
    return { rep: q.rep, quota: Number(q.quota), closed, pct };
  }).sort((a, b) => b.pct - a.pct);

  const md = ["# Quota Attainment Report", "", "| Rep | Quota | Closed | Attainment |", "|---|---|---|---|",
    ...rows.map((r) => `| ${r.rep} | $${r.quota.toLocaleString()} | $${r.closed.toLocaleString()} | ${r.pct.toFixed(1)}% |`)].join("\n");

  const { writeFile: wf } = await import("node:fs/promises");
  await wf("attainment-report.md", md + "\n", "utf8");
  console.log("Wrote attainment-report.md");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
