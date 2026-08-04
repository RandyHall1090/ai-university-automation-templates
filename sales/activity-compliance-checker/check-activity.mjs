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

function toCsv(headers, rows) {
  const escape = (v) => {
    const str = String(v ?? "");
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) lines.push(headers.map((h) => escape(row[h])).join(","));
  return lines.join("\n") + "\n";
}

function daysSince(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: node check-activity.mjs <deals.csv> [--max-gap-days=14]");
    process.exit(1);
  }
  const flag = process.argv.find((a) => a.startsWith("--max-gap-days="));
  const maxGap = flag ? Number(flag.split("=")[1]) : 14;

  const deals = parseCsv(await readFile(input, "utf8"));
  const gaps = deals
    .map((d) => ({ ...d, gap_days: daysSince(d.last_activity_date) }))
    .filter((d) => d.gap_days !== null && d.gap_days > maxGap)
    .sort((a, b) => b.gap_days - a.gap_days);

  await writeFile("activity-gaps.csv", toCsv([...Object.keys(deals[0] ?? {}), "gap_days"], gaps), "utf8");
  console.log(`${gaps.length} of ${deals.length} open deals exceed the ${maxGap}-day activity gap threshold.`);
  console.log("Wrote activity-gaps.csv");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
