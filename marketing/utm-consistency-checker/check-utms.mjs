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
  const [, , urlsPath, convPath] = process.argv;
  if (!urlsPath || !convPath) {
    console.error("Usage: node check-utms.mjs <urls.csv> <convention.json>");
    process.exit(1);
  }
  const urls = parseCsv(await readFile(urlsPath, "utf8"));
  const convention = JSON.parse(await readFile(convPath, "utf8"));

  const violations = [];
  for (const row of urls) {
    let params;
    try {
      params = new URL(row.url).searchParams;
    } catch {
      violations.push({ url: row.url, issue: "invalid_url" });
      continue;
    }
    const issues = [];
    for (const req of convention.required_params) {
      if (!params.has(req)) issues.push(`missing_${req}`);
    }
    for (const [param, allowed] of Object.entries(convention.allowed_values || {})) {
      const val = params.get(param);
      if (val && !allowed.includes(val)) issues.push(`invalid_${param}:${val}`);
    }
    if (issues.length) violations.push({ url: row.url, issue: issues.join("|") });
  }

  await writeFile("utm-violations.csv", toCsv(["url", "issue"], violations), "utf8");
  console.log(`${violations.length} of ${urls.length} URLs have UTM issues.`);
  console.log("Wrote utm-violations.csv");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
