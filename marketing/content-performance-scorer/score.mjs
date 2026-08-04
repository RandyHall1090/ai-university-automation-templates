#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";

const WEIGHTS = { views: 1, shares: 5, conversions: 25 };

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
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: node score.mjs <content.csv>");
    process.exit(1);
  }
  const rows = parseCsv(await readFile(input, "utf8"));
  const scored = rows.map((r) => ({
    ...r,
    score: (Number(r.views) || 0) * WEIGHTS.views + (Number(r.shares) || 0) * WEIGHTS.shares + (Number(r.conversions) || 0) * WEIGHTS.conversions,
  })).sort((a, b) => b.score - a.score);

  await writeFile("content-ranked.csv", toCsv([...Object.keys(rows[0] ?? {}), "score"], scored), "utf8");
  const top = scored.slice(0, 10).map((r, i) => `${i + 1}. ${r.title} (score: ${r.score}) — ${r.url}`).join("\n");
  await writeFile("top-performers.md", `# Top Performing Content\n\n${top}\n`, "utf8");

  console.log(`Scored and ranked ${rows.length} pieces of content.`);
  console.log("Wrote content-ranked.csv and top-performers.md");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
