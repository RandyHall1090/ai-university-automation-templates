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

// Returns null (not 0) for a blank/invalid position — a blank must not be
// treated as "ranks #0" in either direction.
function parsePosition(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

async function main() {
  const [, , yoursPath, compPath] = process.argv;
  if (!yoursPath || !compPath) {
    console.error("Usage: node find-gaps.mjs <your-rankings.csv> <competitor-rankings.csv>");
    process.exit(1);
  }
  const topNFlag = process.argv.find((a) => a.startsWith("--top-n="));
  const worseFlag = process.argv.find((a) => a.startsWith("--worse-than="));
  const topN = topNFlag ? Number(topNFlag.split("=")[1]) : 20;
  const worseThan = worseFlag ? Number(worseFlag.split("=")[1]) : 50;

  const yours = parseCsv(await readFile(yoursPath, "utf8"));
  const competitor = parseCsv(await readFile(compPath, "utf8"));
  const yourPositions = new Map(yours.map((r) => [r.keyword.toLowerCase(), parsePosition(r.position)]));

  const gaps = competitor
    .map((r) => ({ ...r, _pos: parsePosition(r.position) }))
    .filter((r) => r._pos !== null && r._pos <= topN)
    .map((r) => ({ ...r, your_position: yourPositions.get(r.keyword.toLowerCase()) ?? null }))
    .filter((r) => r.your_position === null || r.your_position > worseThan)
    .sort((a, b) => (Number(b.search_volume) || 0) - (Number(a.search_volume) || 0));

  await writeFile("keyword-gaps.csv", toCsv(["keyword", "position", "search_volume", "your_position"], gaps), "utf8");
  console.log(`Found ${gaps.length} keyword gap(s) worth targeting.`);
  console.log("Wrote keyword-gaps.csv");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
