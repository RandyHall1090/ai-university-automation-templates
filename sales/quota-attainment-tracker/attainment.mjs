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

  await writeFile("attainment-report.md", md + "\n", "utf8");
  console.log("Wrote attainment-report.md");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
