#!/usr/bin/env node
// Flags only — never approves, rejects, or reimburses. See README.md.
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

function parseMoney(v) {
  if (v === undefined || v === null || v === "") return null;
  const cleaned = String(v).replace(/[$,]/g, "").trim();
  const negParen = /^\(.*\)$/.test(cleaned);
  const num = Number(negParen ? cleaned.slice(1, -1) : cleaned);
  if (Number.isNaN(num)) return null;
  return negParen ? -num : num;
}

async function main() {
  const [, , expPath, policyPath] = process.argv;
  if (!expPath || !policyPath) {
    console.error("Usage: node check-expenses.mjs <expenses.csv> <policy.json>");
    process.exit(1);
  }
  const expenses = parseCsv(await readFile(expPath, "utf8"));
  const { category_limits, receipt_required_above, disallowed_categories } = JSON.parse(await readFile(policyPath, "utf8"));

  const limitsByLowerCategory = Object.fromEntries(
    Object.entries(category_limits || {}).map(([k, v]) => [k.toLowerCase(), v])
  );
  const disallowedLower = (disallowed_categories || []).map((c) => c.toLowerCase());
  // A missing receipt_required_above must NOT silently disable the receipt
  // rule (amount > undefined is always false) — default to 0, the safe
  // direction (every unreceipted expense gets flagged) rather than none.
  const receiptThreshold = Number.isFinite(receipt_required_above) ? receipt_required_above : 0;

  const violations = expenses.map((e) => {
    const flags = [];
    const amount = parseMoney(e.amount) ?? 0;
    const categoryLower = (e.category || "").toLowerCase();
    const limit = limitsByLowerCategory[categoryLower];
    if (limit !== undefined && amount > limit) flags.push(`over_category_limit_$${limit}`);
    if (amount > receiptThreshold && String(e.has_receipt).toLowerCase() !== "true") flags.push("missing_receipt");
    if (disallowedLower.includes(categoryLower)) flags.push("disallowed_category");
    return { ...e, flags: flags.join("|") };
  }).filter((e) => e.flags);

  await writeFile("policy-violations.csv", toCsv([...Object.keys(expenses[0] ?? {}), "flags"], violations), "utf8");
  console.log(`${violations.length} of ${expenses.length} line items flagged for policy review.`);
  console.log("Wrote policy-violations.csv. No expense was approved, rejected, or reimbursed by this script.");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
