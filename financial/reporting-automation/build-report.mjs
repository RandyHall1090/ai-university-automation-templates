#!/usr/bin/env node
// Reporting Automation — formats already-verified figures into a board
// report. Invents no numbers — every figure traces to the input JSON.
// Read-only by design. See README.md before running.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REQUIRED_FIELDS = ["period", "revenue", "expenses", "net_income", "cash_balance", "headcount", "highlights", "risks"];

function formatCurrency(n) {
  return typeof n === "number" ? `$${n.toLocaleString()}` : n;
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: node build-report.mjs <verified-numbers.json>");
    process.exit(1);
  }

  const numbers = JSON.parse(await readFile(path, "utf8"));

  // A missing field must be a hard error, not the literal string "undefined"
  // rendered into a board-facing document — this tool's entire premise is
  // that every figure traces to a real, verified input.
  const missing = REQUIRED_FIELDS.filter((f) => numbers[f] === undefined || numbers[f] === null || numbers[f] === "");
  if (missing.length) {
    console.error(`verified-numbers.json is missing required field(s): ${missing.join(", ")}. Refusing to render a report with a blank figure.`);
    process.exit(1);
  }

  const template = await readFile(join(__dirname, "template.md"), "utf8");

  const output = template
    .replace(/{{period}}/g, numbers.period)
    .replace(/{{revenue}}/g, formatCurrency(numbers.revenue))
    .replace(/{{expenses}}/g, formatCurrency(numbers.expenses))
    .replace(/{{net_income}}/g, formatCurrency(numbers.net_income))
    .replace(/{{cash_balance}}/g, formatCurrency(numbers.cash_balance))
    .replace(/{{headcount}}/g, numbers.headcount)
    .replace(/{{highlights}}/g, numbers.highlights)
    .replace(/{{risks}}/g, numbers.risks);

  await writeFile("board-report.md", output, "utf8");
  console.log("Wrote board-report.md — every figure in it traces directly to your input file.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
