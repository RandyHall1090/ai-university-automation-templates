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

function toCsv(headers, rows) {
  const escape = (v) => (String(v ?? "").includes(",") ? `"${v}"` : v ?? "");
  const lines = [headers.join(",")];
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
