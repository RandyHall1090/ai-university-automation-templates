#!/usr/bin/env node
// CRM Hygiene Bot — flags stale/incomplete/malformed CRM contact records.
// Read-only: never modifies your source CRM. See README.md before running.

import { readFile, writeFile } from "node:fs/promises";

const REQUIRED_COLUMNS = ["id", "name", "email", "phone", "company", "last_activity_date", "owner"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseArgs(argv) {
  const input = argv[2];
  if (!input) {
    console.error("Usage: node hygiene-check.mjs <contacts.csv> [--stale-days=180]");
    process.exit(1);
  }
  const staleFlag = argv.find((a) => a.startsWith("--stale-days="));
  const staleDays = staleFlag ? Number(staleFlag.split("=")[1]) : 180;
  return { input, staleDays };
}

// Minimal CSV parser — assumes no embedded commas/quotes in values, which
// is true for standard CRM contact exports. If your export quotes fields,
// pre-clean it or swap in a full CSV library.
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row = {};
    headers.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row;
  });
  return { headers, rows };
}

function toCsv(headers, rows) {
  const escape = (v) => (String(v ?? "").includes(",") ? `"${v}"` : v ?? "");
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => escape(row[h])).join(","));
  return lines.join("\n") + "\n";
}

function daysSince(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

async function main() {
  const { input, staleDays } = parseArgs(process.argv);
  const text = await readFile(input, "utf8");
  const { headers, rows } = parseCsv(text);

  const missingCols = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missingCols.length) {
    console.error(`Input is missing expected columns: ${missingCols.join(", ")}`);
    console.error(`Found columns: ${headers.join(", ")}`);
    process.exit(1);
  }

  const emailCounts = new Map();
  for (const row of rows) {
    const email = row.email.toLowerCase();
    if (email) emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1);
  }

  let flaggedCount = 0;
  const flaggedRows = rows.map((row) => {
    const flags = [];
    if (!row.email) flags.push("missing_email");
    else if (!EMAIL_RE.test(row.email)) flags.push("malformed_email");
    else if (emailCounts.get(row.email.toLowerCase()) > 1) flags.push("duplicate_email");

    if (!row.phone) flags.push("missing_phone");

    const age = daysSince(row.last_activity_date);
    if (age === null) flags.push("invalid_last_activity_date");
    else if (age > staleDays) flags.push(`stale_${age}d`);

    if (flags.length) flaggedCount++;
    return { ...row, flags: flags.join("|") };
  });

  const outHeaders = [...headers, "flags"];
  const outText = toCsv(outHeaders, flaggedRows.filter((r) => r.flags));
  await writeFile("flagged-contacts.csv", outText, "utf8");

  console.log(`Checked ${rows.length} contacts — ${flaggedCount} flagged.`);
  console.log(`Wrote flagged-contacts.csv`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
