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
