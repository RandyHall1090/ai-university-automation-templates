#!/usr/bin/env node
// Expense Categorization — rule-based, read-only categorization of a
// transaction export. Never writes back to a source system. Anything not
// matched by a rule is flagged, never guessed. See README.md.

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

async function main() {
  const [, , txPath, rulesPath] = process.argv;
  if (!txPath || !rulesPath) {
    console.error("Usage: node categorize.mjs <transactions.csv> <rules.json>");
    process.exit(1);
  }

  const transactions = parseCsv(await readFile(txPath, "utf8"));
  const { rules } = JSON.parse(await readFile(rulesPath, "utf8"));

  let uncategorizedCount = 0;
  const categorized = transactions.map((tx) => {
    const desc = (tx.description || "").toLowerCase();
    const match = rules.find((r) => desc.includes(r.keyword.toLowerCase()));
    const category = match ? match.category : "uncategorized";
    if (!match) uncategorizedCount++;
    return { ...tx, category };
  });

  const headers = [...Object.keys(transactions[0] ?? {}), "category"];
  await writeFile("categorized-transactions.csv", toCsv(headers, categorized), "utf8");

  console.log(`Categorized ${transactions.length} transactions — ${uncategorizedCount} need human review (uncategorized).`);
  console.log("Wrote categorized-transactions.csv. This script never writes back to any accounting system.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
