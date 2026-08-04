#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";

const WEIGHTS = { views: 1, shares: 5, conversions: 25 };

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
