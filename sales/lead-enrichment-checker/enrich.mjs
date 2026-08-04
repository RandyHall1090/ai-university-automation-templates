#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";

const FIELDS = ["industry", "company_size", "revenue"];

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
