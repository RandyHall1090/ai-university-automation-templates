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

function normOutcome(o) {
  return (o || "").trim().toLowerCase();
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: node analyze.mjs <closed-deals.csv>");
    process.exit(1);
  }
  const deals = parseCsv(await readFile(path, "utf8"));
  const lost = deals.filter((d) => normOutcome(d.outcome) === "lost");
  const won = deals.filter((d) => normOutcome(d.outcome) === "won");

  const lossReasons = {};
  for (const d of lost) lossReasons[d.loss_reason || "(unspecified)"] = (lossReasons[d.loss_reason || "(unspecified)"] || 0) + 1;

  const bySegment = {};
  for (const d of deals) {
    const seg = d.segment || "(none)";
    bySegment[seg] ??= { won: 0, lost: 0 };
    const o = normOutcome(d.outcome);
    if (o === "won") bySegment[seg].won++;
    if (o === "lost") bySegment[seg].lost++;
  }

  const avgWonSize = won.length ? won.reduce((s, d) => s + (Number(d.amount) || 0), 0) / won.length : 0;
  const avgLostSize = lost.length ? lost.reduce((s, d) => s + (Number(d.amount) || 0), 0) / lost.length : 0;

  const md = [
    "# Win/Loss Report", "",
    `- Won: ${won.length} | Lost: ${lost.length}`,
    `- Avg won deal size: $${avgWonSize.toFixed(0)} | Avg lost deal size: $${avgLostSize.toFixed(0)}`, "",
    "## Loss Reasons", "",
    ...Object.entries(lossReasons).sort((a, b) => b[1] - a[1]).map(([r, c]) => `- ${r}: ${c}`), "",
    "## Win Rate by Segment", "",
    "| Segment | Won | Lost | Win Rate |", "|---|---|---|---|",
    // A segment with no won/lost deals reports "n/a", not a misleading "0.0%".
    ...Object.entries(bySegment).map(([seg, s]) => {
      const total = s.won + s.lost;
      const rate = total ? `${((s.won / total) * 100).toFixed(1)}%` : "n/a";
      return `| ${seg} | ${s.won} | ${s.lost} | ${rate} |`;
    }),
  ].join("\n");

  await writeFile("win-loss-report.md", md + "\n", "utf8");
  console.log("Wrote win-loss-report.md");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
