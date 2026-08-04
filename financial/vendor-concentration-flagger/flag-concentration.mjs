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
