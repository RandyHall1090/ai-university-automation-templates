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
  const yourPositions = new Map(yours.map((r) => [r.keyword.toLowerCase(), Number(r.position)]));

  const gaps = competitor
    .filter((r) => Number(r.position) <= topN)
    .map((r) => ({ ...r, your_position: yourPositions.get(r.keyword.toLowerCase()) ?? null }))
    .filter((r) => r.your_position === null || r.your_position > worseThan)
    .sort((a, b) => (Number(b.search_volume) || 0) - (Number(a.search_volume) || 0));

  await writeFile("keyword-gaps.csv", toCsv(["keyword", "position", "search_volume", "your_position"], gaps), "utf8");
  console.log(`Found ${gaps.length} keyword gap(s) worth targeting.`);
  console.log("Wrote keyword-gaps.csv");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
