#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";

const FIELDS = ["industry", "company_size", "revenue"];

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
  const [, , leadsPath, sourcePath] = process.argv;
  if (!leadsPath) {
    console.error("Usage: node enrich.mjs <leads.csv> [enrichment-source.csv]");
    process.exit(1);
  }
  const leads = parseCsv(await readFile(leadsPath, "utf8"));
  const source = sourcePath ? parseCsv(await readFile(sourcePath, "utf8")) : [];
  const byDomain = new Map(source.map((s) => [s.domain, s]));

  const enriched = leads.map((lead) => {
    const match = byDomain.get(lead.domain);
    const filled = { ...lead };
    if (match) for (const f of FIELDS) if (!filled[f] && match[f]) filled[f] = match[f];
    return filled;
  });

  const stillMissing = enriched.filter((l) => FIELDS.some((f) => !l[f]))
    .map((l) => ({ ...l, missing_fields: FIELDS.filter((f) => !l[f]).join("|") }));

  await writeFile("enriched-leads.csv", toCsv(Object.keys(enriched[0] ?? {}), enriched), "utf8");
  await writeFile("still-missing.csv", toCsv([...Object.keys(leads[0] ?? {}), "missing_fields"], stillMissing), "utf8");

  console.log(`${leads.length} leads processed — ${stillMissing.length} still missing at least one field.`);
  console.log("Wrote enriched-leads.csv and still-missing.csv");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
