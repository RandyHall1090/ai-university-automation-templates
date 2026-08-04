#!/usr/bin/env node
// Flags only — never approves, rejects, or reimburses. See README.md.
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
  const [, , expPath, policyPath] = process.argv;
  if (!expPath || !policyPath) {
    console.error("Usage: node check-expenses.mjs <expenses.csv> <policy.json>");
    process.exit(1);
  }
  const expenses = parseCsv(await readFile(expPath, "utf8"));
  const { category_limits, receipt_required_above, disallowed_categories } = JSON.parse(await readFile(policyPath, "utf8"));

  const violations = expenses.map((e) => {
    const flags = [];
    const amount = Number(e.amount) || 0;
    const limit = category_limits[e.category];
    if (limit !== undefined && amount > limit) flags.push(`over_category_limit_$${limit}`);
    if (amount > receipt_required_above && String(e.has_receipt).toLowerCase() !== "true") flags.push("missing_receipt");
    if (disallowed_categories.includes(e.category)) flags.push("disallowed_category");
    return { ...e, flags: flags.join("|") };
  }).filter((e) => e.flags);

  await writeFile("policy-violations.csv", toCsv([...Object.keys(expenses[0] ?? {}), "flags"], violations), "utf8");
  console.log(`${violations.length} of ${expenses.length} line items flagged for policy review.`);
  console.log("Wrote policy-violations.csv. No expense was approved, rejected, or reimbursed by this script.");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
