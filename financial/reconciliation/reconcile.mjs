#!/usr/bin/env node
// Reconciliation Assistant — matches bank feed vs. ledger by amount +
// date tolerance (or reference), flags unmatched entries on both sides.
// Read-only: never posts an adjustment. See README.md before running.

import { readFile, writeFile } from "node:fs/promises";

function parseArgs(argv) {
  const [bankPath, ledgerPath] = [argv[2], argv[3]];
  if (!bankPath || !ledgerPath) {
    console.error("Usage: node reconcile.mjs <bank.csv> <ledger.csv> [--tolerance-days=3]");
    process.exit(1);
  }
  const flag = argv.find((a) => a.startsWith("--tolerance-days="));
  return { bankPath, ledgerPath, toleranceDays: flag ? Number(flag.split("=")[1]) : 3 };
}

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

function daysBetween(d1, d2) {
  return Math.abs((new Date(d1).getTime() - new Date(d2).getTime()) / (1000 * 60 * 60 * 24));
}

async function main() {
  const { bankPath, ledgerPath, toleranceDays } = parseArgs(process.argv);
  const bank = parseCsv(await readFile(bankPath, "utf8"));
  const ledger = parseCsv(await readFile(ledgerPath, "utf8"));

  const usedLedger = new Set();
  const matched = [];
  const unmatchedBank = [];

  for (const b of bank) {
    let match = null;

    if (b.reference) {
      match = ledger.find((l, i) => !usedLedger.has(i) && l.reference === b.reference);
    }
    if (!match) {
      match = ledger.find(
        (l, i) => !usedLedger.has(i) && Number(l.amount) === Number(b.amount) && daysBetween(l.date, b.date) <= toleranceDays
      );
    }

    if (match) {
      usedLedger.add(ledger.indexOf(match));
      matched.push({ bank: b, ledger: match });
    } else {
      unmatchedBank.push(b);
    }
  }

  const unmatchedLedger = ledger.filter((_, i) => !usedLedger.has(i));

  const md = [
    "# Reconciliation Report",
    "",
    `## Matched (${matched.length})`,
    "",
    ...matched.map((m) => `- ${m.bank.date} | ${m.bank.description} | $${m.bank.amount}`),
    "",
    `## Unmatched Bank Entries — no ledger match (${unmatchedBank.length})`,
    "",
    unmatchedBank.length ? unmatchedBank.map((b) => `- ${b.date} | ${b.description} | $${b.amount}`).join("\n") : "None.",
    "",
    `## Unmatched Ledger Entries — no bank match (${unmatchedLedger.length})`,
    "",
    unmatchedLedger.length ? unmatchedLedger.map((l) => `- ${l.date} | ${l.description} | $${l.amount}`).join("\n") : "None.",
  ].join("\n");

  await writeFile("reconciliation-report.md", md + "\n", "utf8");

  console.log(`${matched.length} matched, ${unmatchedBank.length} unmatched bank, ${unmatchedLedger.length} unmatched ledger.`);
  console.log("Wrote reconciliation-report.md. No adjustments were posted — review unmatched items manually.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
