#!/usr/bin/env node
// Flags/routes only — never grants or applies an approval. See README.md.
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
