#!/usr/bin/env node
// Flags/routes only — never grants or applies an approval. See README.md.
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
  const [, , dealsPath, rulesPath] = process.argv;
  if (!dealsPath || !rulesPath) {
    console.error("Usage: node route.mjs <deals.csv> <approval-rules.json>");
    process.exit(1);
  }
  const deals = parseCsv(await readFile(dealsPath, "utf8"));
  const { tiers } = JSON.parse(await readFile(rulesPath, "utf8"));
  const sortedTiers = [...tiers].sort((a, b) => a.max_discount_pct - b.max_discount_pct);

  const queue = deals.map((d) => {
    const list = Number(d.list_price) || 0;
    const sale = Number(d.sale_price) || 0;
    const discountPct = list > 0 ? ((list - sale) / list) * 100 : 0;
    const tier = sortedTiers.find((t) => discountPct <= t.max_discount_pct);
    return { ...d, discount_pct: discountPct.toFixed(1), approver_needed: tier?.approver || "none" };
  }).filter((d) => d.approver_needed !== "none");

  await writeFile("approval-queue.csv", toCsv([...Object.keys(deals[0] ?? {}), "discount_pct", "approver_needed"], queue), "utf8");
  console.log(`${queue.length} of ${deals.length} deals require approval sign-off.`);
  console.log("Wrote approval-queue.csv — no approvals were granted automatically.");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
