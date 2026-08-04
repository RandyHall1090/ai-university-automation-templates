#!/usr/bin/env node
// Straight-line projection from historical trend only. Not a guarantee of
// future results — see README.md and the disclaimer in the output itself.
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
    console.error("Usage: node forecast.mjs <cash-history.csv> [--months-ahead=3]");
    process.exit(1);
  }
  const flag = process.argv.find((a) => a.startsWith("--months-ahead="));
  const monthsAhead = flag ? Number(flag.split("=")[1]) : 3;

  const history = parseCsv(await readFile(input, "utf8"));
  const trailing3 = history.slice(-3);
  const avgNet = trailing3.reduce((s, m) => s + (Number(m.inflow) || 0) - (Number(m.outflow) || 0), 0) / trailing3.length;
  const currentBalance = Number(history[history.length - 1].ending_balance);

  const projections = [];
  let balance = currentBalance;
  for (let i = 1; i <= monthsAhead; i++) {
    balance += avgNet;
    projections.push({ month_offset: i, projected_balance: balance });
  }

  const md = [
    "# Cash Flow Forecast", "",
    "**This is a straight-line projection from trailing-3-month average net cash flow — not a guarantee of future results.**", "",
    `- Current balance: $${currentBalance.toLocaleString()}`,
    `- Avg monthly net cash flow (trailing 3mo): $${avgNet.toFixed(0)}`, "",
    "| Months Ahead | Projected Balance |", "|---|---|",
    ...projections.map((p) => `| ${p.month_offset} | $${p.projected_balance.toFixed(0)} |`),
  ].join("\n");

  await writeFile("cash-flow-forecast.md", md + "\n", "utf8");
  console.log(md);
  console.log("\nWrote cash-flow-forecast.md");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
