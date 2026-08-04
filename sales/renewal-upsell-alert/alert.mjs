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
