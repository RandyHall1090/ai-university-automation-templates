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

function daysBetween(d1, d2) {
  return Math.abs((new Date(d1).getTime() - new Date(d2).getTime()) / (1000 * 60 * 60 * 24));
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: node find-duplicates.mjs <invoices.csv> [--date-window-days=14]");
    process.exit(1);
  }
  const flag = process.argv.find((a) => a.startsWith("--date-window-days="));
  const windowDays = flag ? Number(flag.split("=")[1]) : 14;

  const invoices = parseCsv(await readFile(input, "utf8"));
  const flagged = [];

  for (let i = 0; i < invoices.length; i++) {
    for (let j = i + 1; j < invoices.length; j++) {
      const a = invoices[i], b = invoices[j];
      if (a.vendor !== b.vendor || Number(a.amount) !== Number(b.amount)) continue;
      if (a.invoice_number === b.invoice_number) {
        flagged.push({ ...a, match_type: "exact_duplicate", matched_invoice_id: b.invoice_id });
      } else if (daysBetween(a.invoice_date, b.invoice_date) <= windowDays) {
        flagged.push({ ...a, match_type: "possible_duplicate", matched_invoice_id: b.invoice_id });
      }
    }
  }

  await writeFile("duplicate-invoice-flags.csv", toCsv([...Object.keys(invoices[0] ?? {}), "match_type", "matched_invoice_id"], flagged), "utf8");
  console.log(`${flagged.length} potential duplicate(s) flagged out of ${invoices.length} invoices.`);
  console.log("Wrote duplicate-invoice-flags.csv. No invoice was paid, held, or modified — review manually.");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
