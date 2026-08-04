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
  const [, , notesPath, compPath] = process.argv;
  if (!notesPath || !compPath) {
    console.error("Usage: node track-mentions.mjs <deal-notes.csv> <competitors.json>");
    process.exit(1);
  }
  const notes = parseCsv(await readFile(notesPath, "utf8"));
  const { competitors } = JSON.parse(await readFile(compPath, "utf8"));

  const mentions = [];
  const totals = {};
  for (const n of notes) {
    const text = (n.note_text || "").toLowerCase();
    for (const c of competitors) {
      const count = text.split(c.toLowerCase()).length - 1;
      if (count > 0) {
        mentions.push({ deal_id: n.deal_id, competitor: c, mentions: count });
        totals[c] = (totals[c] || 0) + count;
      }
    }
  }

  await writeFile("competitor-mentions.csv", toCsv(["deal_id", "competitor", "mentions"], mentions), "utf8");
  const summary = ["# Competitor Mention Summary", "", ...Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([c, t]) => `- ${c}: ${t} mentions`)].join("\n");
  await writeFile("competitor-summary.md", summary + "\n", "utf8");

  console.log(`Found ${mentions.length} mention records across ${Object.keys(totals).length} competitors.`);
  console.log("Wrote competitor-mentions.csv and competitor-summary.md");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
