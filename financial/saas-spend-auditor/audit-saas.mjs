#!/usr/bin/env node
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

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: node audit-saas.mjs <subscriptions.csv>");
    process.exit(1);
  }
  const subs = parseCsv(await readFile(input, "utf8"));

  // Category grouping is normalized (trim + lowercase) so "Project Mgmt" and
  // "project mgmt" don't split one real overlap into two invisible halves.
  // Blank categories are excluded — they can't establish a real overlap.
  const byCategory = {};
  for (const s of subs) {
    const key = (s.category || "").trim().toLowerCase();
    if (!key) continue;
    byCategory[key] ??= { label: s.category, items: [] };
    byCategory[key].items.push(s);
  }

  const lines = ["# SaaS Spend Overlap Report", ""];
  let overlapCount = 0;
  for (const { label, items } of Object.values(byCategory)) {
    // Dedupe by vendor within the category — the same vendor listed twice
    // (e.g. a monthly and an annual line) is one tool, not two competing ones.
    const uniqueVendors = new Map();
    for (const i of items) {
      const vKey = (i.vendor || "").trim().toLowerCase();
      if (!uniqueVendors.has(vKey)) uniqueVendors.set(vKey, i);
    }
    if (uniqueVendors.size > 1) {
      overlapCount++;
      const uniqueItems = Array.from(uniqueVendors.values());
      const total = uniqueItems.reduce((s, i) => s + (Number(i.monthly_cost) || 0), 0);
      lines.push(`## ${label} — ${uniqueItems.length} tools, $${total.toFixed(0)}/mo combined`, "");
      for (const i of uniqueItems) lines.push(`- ${i.vendor}: $${i.monthly_cost}/mo (${i.department})`);
      lines.push("");
    }
  }

  if (!overlapCount) lines.push("No category has more than one distinct active vendor.");

  await writeFile("saas-overlap-report.md", lines.join("\n") + "\n", "utf8");
  console.log(`${overlapCount} categor${overlapCount === 1 ? "y" : "ies"} with potential overlap.`);
  console.log("Wrote saas-overlap-report.md. Read-only — no subscriptions were changed.");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
