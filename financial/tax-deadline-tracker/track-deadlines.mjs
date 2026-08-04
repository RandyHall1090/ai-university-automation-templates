#!/usr/bin/env node
// Reminder tool only — does not file anything and is not a substitute for
// professional tax advice. See README.md.
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

function daysUntil(dateStr) {
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: node track-deadlines.mjs <deadlines.csv> [--window-days=30]");
    process.exit(1);
  }
  const flag = process.argv.find((a) => a.startsWith("--window-days="));
  const windowDays = flag ? Number(flag.split("=")[1]) : 30;

  const deadlines = parseCsv(await readFile(input, "utf8"));
  const upcoming = deadlines
    .filter((d) => d.status !== "filed")
    .map((d) => ({ ...d, days_until: daysUntil(d.due_date) }))
    .filter((d) => d.days_until <= windowDays)
    .sort((a, b) => a.days_until - b.days_until);

  const md = ["# Upcoming Tax Deadlines", "", "| Filing | Jurisdiction | Due | Days Until | Owner |", "|---|---|---|---|---|",
    ...upcoming.map((d) => `| ${d.filing_name} | ${d.jurisdiction} | ${d.due_date} | ${d.days_until} | ${d.owner} |`)].join("\n");

  await writeFile("upcoming-deadlines.md", md + "\n", "utf8");
  console.log(`${upcoming.length} unfiled deadline(s) within ${windowDays} days.`);
  console.log("Wrote upcoming-deadlines.md. This does not file anything — verify with your tax advisor.");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
