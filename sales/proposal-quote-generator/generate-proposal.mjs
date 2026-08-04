#!/usr/bin/env node
// Proposal & Quote Generator — assembles a proposal document from your
// own deal fields and line items. All pricing is human-entered input;
// this script only sums it and fills a template. See README.md.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function formatCurrency(n) {
  return `$${n.toFixed(2)}`;
}

function lineItemsTable(items) {
  const rows = items.map(
    (i) => `| ${i.description} | ${i.quantity} | ${formatCurrency(i.unit_price)} | ${formatCurrency(i.quantity * i.unit_price)} |`
  );
  return ["| Description | Qty | Unit Price | Line Total |", "|---|---|---|---|", ...rows].join("\n");
}

async function main() {
  const dealPath = process.argv[2];
  if (!dealPath) {
    console.error("Usage: node generate-proposal.mjs <deal.json>");
    process.exit(1);
  }

  const deal = JSON.parse(await readFile(dealPath, "utf8"));

  if (!Array.isArray(deal.line_items) || !deal.line_items.length) {
    console.error("deal.json must include a non-empty line_items array.");
    process.exit(1);
  }
  // A customer-facing document must never show "$NaN" — refuse to render
  // rather than silently produce a broken total from a bad input.
  for (const item of deal.line_items) {
    if (typeof item.quantity !== "number" || typeof item.unit_price !== "number" || Number.isNaN(item.quantity) || Number.isNaN(item.unit_price)) {
      console.error(`Line item "${item.description ?? "(no description)"}" has a non-numeric quantity or unit_price — fix deal.json before generating a customer-facing proposal.`);
      process.exit(1);
    }
  }

  const template = await readFile(join(__dirname, "template.md"), "utf8");
  const total = deal.line_items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

  const output = template
    .replace(/{{customer_name}}/g, deal.customer_name ?? "")
    .replace(/{{customer_contact}}/g, deal.customer_contact ?? "")
    .replace(/{{prepared_by}}/g, deal.prepared_by ?? "")
    .replace(/{{valid_until}}/g, deal.valid_until ?? "")
    .replace(/{{line_items_table}}/g, lineItemsTable(deal.line_items))
    .replace(/{{total}}/g, formatCurrency(total))
    .replace(/{{payment_terms}}/g, deal.payment_terms ?? "")
    .replace(/{{notes}}/g, deal.notes ?? "");

  const outPath = `proposal-${deal.deal_id ?? "draft"}.md`;
  await writeFile(outPath, output, "utf8");

  console.log(`Total: ${formatCurrency(total)}`);
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
