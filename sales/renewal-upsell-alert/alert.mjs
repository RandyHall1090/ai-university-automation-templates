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
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => row[h] ?? "").join(","));
  return lines.join("\n") + "\n";
}

function daysUntil(dateStr) {
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: node alert.mjs <contracts.csv> [--window-days=90]");
    process.exit(1);
  }
  const flag = process.argv.find((a) => a.startsWith("--window-days="));
  const windowDays = flag ? Number(flag.split("=")[1]) : 90;

  const contracts = parseCsv(await readFile(input, "utf8"));
  const alerts = contracts.map((c) => {
    const reasons = [];
    const daysLeft = daysUntil(c.renewal_date);
    if (daysLeft >= 0 && daysLeft <= windowDays) reasons.push(`renewal_in_${daysLeft}d`);
    const utilization = (Number(c.seats_used) || 0) / (Number(c.seats_purchased) || 1);
    if (utilization >= 0.9) reasons.push(`upsell_candidate_${Math.round(utilization * 100)}pct_utilized`);
    return { ...c, alert_reasons: reasons.join("|") };
  }).filter((c) => c.alert_reasons);

  await writeFile("renewal-upsell-alerts.csv", toCsv([...Object.keys(contracts[0] ?? {}), "alert_reasons"], alerts), "utf8");
  console.log(`${alerts.length} of ${contracts.length} contracts flagged.`);
  console.log("Wrote renewal-upsell-alerts.csv");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
