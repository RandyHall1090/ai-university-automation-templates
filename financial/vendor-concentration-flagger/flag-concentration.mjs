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
    console.error("Usage: node flag-concentration.mjs <transactions.csv> [--concentration-threshold-pct=25]");
    process.exit(1);
  }
  const flag = process.argv.find((a) => a.startsWith("--concentration-threshold-pct="));
  const threshold = flag ? Number(flag.split("=")[1]) : 25;

  const txs = parseCsv(await readFile(input, "utf8"));
  const byVendor = {};
  let total = 0;
  for (const t of txs) {
    const amt = Number(t.amount) || 0;
    byVendor[t.vendor] = (byVendor[t.vendor] || 0) + amt;
    total += amt;
  }

  const shares = Object.entries(byVendor).map(([vendor, amount]) => ({ vendor, amount, share_pct: (amount / total) * 100 })).sort((a, b) => b.share_pct - a.share_pct);
  const flagged = shares.filter((s) => s.share_pct >= threshold);

  const md = [
    "# Vendor Concentration Report", "",
    `- Total spend: $${total.toLocaleString()}`, "",
    "## Flagged (above threshold)", "",
    flagged.length ? flagged.map((s) => `- ${s.vendor}: $${s.amount.toLocaleString()} (${s.share_pct.toFixed(1)}% of total spend)`).join("\n") : "None.", "",
    "## All Vendors by Share", "",
    "| Vendor | Spend | Share |", "|---|---|---|",
    ...shares.map((s) => `| ${s.vendor} | $${s.amount.toLocaleString()} | ${s.share_pct.toFixed(1)}% |`),
  ].join("\n");

  await writeFile("vendor-concentration-report.md", md + "\n", "utf8");
  console.log(`${flagged.length} vendor(s) above the ${threshold}% concentration threshold.`);
  console.log("Wrote vendor-concentration-report.md");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
