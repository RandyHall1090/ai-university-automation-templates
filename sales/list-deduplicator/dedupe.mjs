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
  return { headers, rows: clean.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = (cells[i] ?? "").trim()));
    return obj;
  }) };
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
  const paths = process.argv.slice(2);
  if (!paths.length) {
    console.error("Usage: node dedupe.mjs <list1.csv> [list2.csv] [...]");
    process.exit(1);
  }

  const seen = new Map();
  const domainCounts = new Map();
  let allHeaders = [];

  for (const path of paths) {
    const text = await readFile(path, "utf8");
    const { headers, rows } = parseCsv(text);
    for (const h of headers) if (!allHeaders.includes(h)) allHeaders.push(h);
    for (const row of rows) {
      const email = (row.email || "").toLowerCase();
      if (!email || seen.has(email)) continue;
      seen.set(email, row);
      const domain = email.split("@")[1] || "";
      domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
    }
  }

  const dedupedRows = Array.from(seen.values());
  await writeFile("deduped-list.csv", toCsv(allHeaders, dedupedRows), "utf8");

  const overlap = Array.from(domainCounts.entries()).filter(([, c]) => c > 1).map(([domain, count]) => ({ domain, count }));
  await writeFile("domain-overlap.csv", toCsv(["domain", "count"], overlap), "utf8");

  console.log(`Merged ${paths.length} files — ${dedupedRows.length} unique contacts, ${overlap.length} domains with multiple contacts.`);
  console.log("Wrote deduped-list.csv and domain-overlap.csv");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
