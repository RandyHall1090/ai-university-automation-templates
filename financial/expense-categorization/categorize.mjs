#!/usr/bin/env node
// Expense Categorization — rule-based, read-only categorization of a
// transaction export. Never writes back to a source system. Anything not
// matched by a rule is flagged, never guessed. See README.md.

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
  const escape = (v) => (String(v ?? "").includes(",") ? `"${v}"` : v ?? "");
  const lines = [headers.join(",")];
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
