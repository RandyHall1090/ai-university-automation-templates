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

function parseMoney(v) {
  if (v === undefined || v === null || v === "") return null;
  const cleaned = String(v).replace(/[$,]/g, "").trim();
  const negParen = /^\(.*\)$/.test(cleaned);
  const num = Number(negParen ? cleaned.slice(1, -1) : cleaned);
  if (Number.isNaN(num)) return null;
  return negParen ? -num : num;
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
  // Vendor names are normalized (trim + lowercase) for grouping so "AWS" and
  // "aws" don't split one vendor's spend into two smaller, individually
  // unremarkable shares — the exact failure mode that hides real concentration.
  const byVendor = {};
  let total = 0;
  for (const t of txs) {
    const key = String(t.vendor ?? "").trim().toLowerCase();
    if (!key) continue;
    const amt = parseMoney(t.amount) ?? 0;
    byVendor[key] ??= { label: t.vendor, amount: 0 };
    byVendor[key].amount += amt;
    total += amt;
  }

  const shares = Object.values(byVendor)
    .map((v) => ({ vendor: v.label, amount: v.amount, share_pct: total > 0 ? (v.amount / total) * 100 : null }))
    .sort((a, b) => (b.share_pct ?? 0) - (a.share_pct ?? 0));
  const flagged = shares.filter((s) => s.share_pct !== null && s.share_pct >= threshold);

  const md = [
    "# Vendor Concentration Report", "",
    total > 0 ? `- Total spend: $${total.toLocaleString()}` : "- Total spend: $0 (or all amounts unparseable/net to zero — share percentages cannot be computed)", "",
    "## Flagged (above threshold)", "",
    flagged.length ? flagged.map((s) => `- ${s.vendor}: $${s.amount.toLocaleString()} (${s.share_pct.toFixed(1)}% of total spend)`).join("\n") : "None.", "",
    "## All Vendors by Share", "",
    "| Vendor | Spend | Share |", "|---|---|---|",
    ...shares.map((s) => `| ${s.vendor} | $${s.amount.toLocaleString()} | ${s.share_pct === null ? "n/a" : s.share_pct.toFixed(1) + "%"} |`),
  ].join("\n");

  await writeFile("vendor-concentration-report.md", md + "\n", "utf8");
  console.log(`${flagged.length} vendor(s) above the ${threshold}% concentration threshold.`);
  console.log("Wrote vendor-concentration-report.md");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
