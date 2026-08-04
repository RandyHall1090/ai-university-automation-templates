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

// Quote-aware CSV parser: handles fields containing commas or quotes
// (RFC4180-lite). A naive split(",") would silently misalign every column
// after a description like "Acme, Inc." — that's worse than an error.
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
  return { headers, rows: clean.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = (cells[i] ?? "").trim()));
    return obj;
  }) };
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
