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
  const [, , leadsPath, rulesPath] = process.argv;
  if (!leadsPath || !rulesPath) {
    console.error("Usage: node route-leads.mjs <scanned-leads.csv> <routing-rules.json>");
    process.exit(1);
  }
  const leads = parseCsv(await readFile(leadsPath, "utf8"));
  const { territory_map, interest_map } = JSON.parse(await readFile(rulesPath, "utf8"));

  const routed = leads.map((l) => ({
    ...l,
    assigned_rep: interest_map[l.interest_tag] || territory_map[l.territory] || "unassigned",
  }));

  await writeFile("routed-leads.csv", toCsv([...Object.keys(leads[0] ?? {}), "assigned_rep"], routed), "utf8");
  console.log(`Routed ${routed.length} leads (${routed.filter((r) => r.assigned_rep === "unassigned").length} unassigned).`);
  console.log("Wrote routed-leads.csv");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
