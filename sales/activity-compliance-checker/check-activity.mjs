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

function toCsv(headers, rows) {
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => row[h] ?? "").join(","));
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
