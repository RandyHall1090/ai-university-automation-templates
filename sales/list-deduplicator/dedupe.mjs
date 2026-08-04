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
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => row[h] ?? "").join(","));
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
    const rows = parseCsv(text);
    const headers = text.trim().split(/\r?\n/)[0].split(",").map((h) => h.trim());
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
