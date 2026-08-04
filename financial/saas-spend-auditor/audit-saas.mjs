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

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: node audit-saas.mjs <subscriptions.csv>");
    process.exit(1);
  }
  const subs = parseCsv(await readFile(input, "utf8"));
  const byCategory = {};
  for (const s of subs) {
    byCategory[s.category] ??= [];
    byCategory[s.category].push(s);
  }

  const lines = ["# SaaS Spend Overlap Report", ""];
  let overlapCount = 0;
  for (const [category, items] of Object.entries(byCategory)) {
    if (items.length > 1) {
      overlapCount++;
      const total = items.reduce((s, i) => s + (Number(i.monthly_cost) || 0), 0);
      lines.push(`## ${category} — ${items.length} tools, $${total.toFixed(0)}/mo combined`, "");
      for (const i of items) lines.push(`- ${i.vendor}: $${i.monthly_cost}/mo (${i.department})`);
      lines.push("");
    }
  }

  if (!overlapCount) lines.push("No category has more than one active vendor.");

  await writeFile("saas-overlap-report.md", lines.join("\n") + "\n", "utf8");
  console.log(`${overlapCount} categor${overlapCount === 1 ? "y" : "ies"} with potential overlap.`);
  console.log("Wrote saas-overlap-report.md. Read-only — no subscriptions were changed.");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
