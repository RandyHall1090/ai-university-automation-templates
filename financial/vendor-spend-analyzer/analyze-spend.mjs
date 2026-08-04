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

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: node analyze-spend.mjs <transactions.csv> [--spike-threshold-pct=50]");
    process.exit(1);
  }
  const flag = process.argv.find((a) => a.startsWith("--spike-threshold-pct="));
  const spikeThreshold = flag ? Number(flag.split("=")[1]) : 50;

  const txs = parseCsv(await readFile(input, "utf8"));
  const byVendorMonth = {};
  for (const t of txs) {
    const month = (t.date || "").slice(0, 7);
    byVendorMonth[t.vendor] ??= {};
    byVendorMonth[t.vendor][month] = (byVendorMonth[t.vendor][month] || 0) + (Number(t.amount) || 0);
  }

  const lines = ["# Vendor Spend Report", ""];
  const spikes = [];
  for (const [vendor, months] of Object.entries(byVendorMonth)) {
    const sortedMonths = Object.keys(months).sort();
    const currentMonth = sortedMonths[sortedMonths.length - 1];
    const prior = sortedMonths.slice(-4, -1);
    const priorAvg = prior.length ? prior.reduce((s, m) => s + months[m], 0) / prior.length : 0;
    const current = months[currentMonth];
    const changePct = priorAvg > 0 ? ((current - priorAvg) / priorAvg) * 100 : 0;
    if (changePct > spikeThreshold) spikes.push({ vendor, current, priorAvg, changePct });
    const total = Object.values(months).reduce((s, v) => s + v, 0);
    lines.push(`- **${vendor}**: total $${total.toLocaleString()} across ${sortedMonths.length} month(s)`);
  }

  lines.push("", "## Spend Spikes", "");
  lines.push(spikes.length ? spikes.map((s) => `- ${s.vendor}: $${s.current.toFixed(0)} this month vs $${s.priorAvg.toFixed(0)} avg (+${s.changePct.toFixed(0)}%)`).join("\n") : "None.");

  await writeFile("vendor-spend-report.md", lines.join("\n") + "\n", "utf8");
  console.log(`${spikes.length} vendor spend spike(s) flagged.`);
  console.log("Wrote vendor-spend-report.md. Read-only — no transactions were modified.");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
