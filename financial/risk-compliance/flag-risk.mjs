#!/usr/bin/env node
// Risk & Compliance Flagging — flags transactions against configurable
// thresholds. Flags only; never blocks, initiates, or moves money.
// See README.md before running.

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

function isWeekend(dateStr) {
  const day = new Date(dateStr).getDay();
  return day === 0 || day === 6;
}

async function main() {
  const [, , txPath, blPath] = process.argv;
  if (!txPath || !blPath) {
    console.error("Usage: node flag-risk.mjs <transactions.csv> <bright-line.json>");
    process.exit(1);
  }

  const transactions = parseCsv(await readFile(txPath, "utf8"));
  const brightLine = JSON.parse(await readFile(blPath, "utf8"));

  let flaggedCount = 0;
  const flagged = transactions.map((tx) => {
    const flags = [];
    const amount = Number(tx.amount) || 0;

    if (amount >= brightLine.large_transaction_threshold) flags.push("large_transaction");
    if (amount >= brightLine.round_dollar_threshold && amount % 100 === 0) flags.push("round_dollar_amount");
    if (brightLine.flag_weekend_transactions && isWeekend(tx.date)) flags.push("weekend_transaction");
    if (String(tx.is_new_vendor).toLowerCase() === "true" && amount >= brightLine.new_vendor_threshold) {
      flags.push("new_vendor_large_first_payment");
    }

    if (flags.length) flaggedCount++;
    return { ...tx, flag_reasons: flags.join("|") };
  });

  const headers = [...Object.keys(transactions[0] ?? {}), "flag_reasons"];
  await writeFile("flagged-transactions.csv", toCsv(headers, flagged.filter((t) => t.flag_reasons)), "utf8");

  console.log(`Checked ${transactions.length} transactions — ${flaggedCount} flagged for review.`);
  console.log("Wrote flagged-transactions.csv. No transaction was blocked, initiated, or modified — flags only.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
