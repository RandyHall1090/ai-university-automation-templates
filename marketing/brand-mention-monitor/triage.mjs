#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";

const URGENT_WORDS = ["refund", "cancel", "lawsuit", "scam", "terrible", "worst", "never again", "complaint"];
const POSITIVE_WORDS = ["love", "amazing", "great", "awesome", "best", "recommend"];

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
    console.error("Usage: node triage.mjs <mentions.csv>");
    process.exit(1);
  }
  const mentions = parseCsv(await readFile(input, "utf8"));
  const triaged = mentions.map((m) => {
    const text = (m.text || "").toLowerCase();
    let category = "neutral";
    if (URGENT_WORDS.some((w) => text.includes(w))) category = "urgent_review";
    else if (POSITIVE_WORDS.some((w) => text.includes(w))) category = "positive";
    return { ...m, category };
  }).sort((a, b) => (a.category === "urgent_review" ? -1 : 1) - (b.category === "urgent_review" ? -1 : 1));

  await writeFile("mentions-triaged.csv", toCsv([...Object.keys(mentions[0] ?? {}), "category"], triaged), "utf8");
  console.log(`${triaged.filter((m) => m.category === "urgent_review").length} mentions need urgent human review.`);
  console.log("Wrote mentions-triaged.csv — this is rough keyword triage, not sentiment analysis. Read every mention yourself.");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
