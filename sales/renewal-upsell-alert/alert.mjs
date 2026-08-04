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

// UTC-consistent days-until: a date-only string is anchored to UTC midnight
// and compared against "today" as UTC midnight, so a renewal due TODAY
// reports 0 (and gets alerted), not -1 (and gets silently excluded).
function daysUntilUtc(dateStr) {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(String(dateStr)) ? `${dateStr}T00:00:00Z` : dateStr;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target.getTime() - todayUtc) / (1000 * 60 * 60 * 24));
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
    const daysLeft = daysUntilUtc(c.renewal_date);
    if (daysLeft !== null && daysLeft >= 0 && daysLeft <= windowDays) reasons.push(`renewal_in_${daysLeft}d`);
    else if (daysLeft !== null && daysLeft < 0) reasons.push(`renewal_overdue_${-daysLeft}d`);

    const seatsPurchased = Number(c.seats_purchased);
    if (seatsPurchased > 0) {
      const utilization = (Number(c.seats_used) || 0) / seatsPurchased;
      if (utilization >= 0.9) reasons.push(`upsell_candidate_${Math.round(utilization * 100)}pct_utilized`);
    } else if (c.seats_purchased !== undefined && c.seats_purchased !== "") {
      reasons.push("invalid_seats_purchased");
    }

    return { ...c, alert_reasons: reasons.join("|") };
  }).filter((c) => c.alert_reasons);

  await writeFile("renewal-upsell-alerts.csv", toCsv([...Object.keys(contracts[0] ?? {}), "alert_reasons"], alerts), "utf8");
  console.log(`${alerts.length} of ${contracts.length} contracts flagged.`);
  console.log("Wrote renewal-upsell-alerts.csv");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
