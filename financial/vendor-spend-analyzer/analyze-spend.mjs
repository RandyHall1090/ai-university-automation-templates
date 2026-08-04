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

function monthKey(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Shifts a "YYYY-MM" key by `delta` calendar months (can be negative).
function shiftMonth(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  return monthKey(new Date(Date.UTC(y, m - 1 + delta, 1)));
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

  // "This month" is the real current calendar month, not whichever month
  // happens to be last in the data — and the prior window is the 3 actual
  // preceding calendar months (missing months count as $0), not just
  // whatever months happened to have transactions.
  const currentMonth = monthKey(new Date());
  const priorMonths = [shiftMonth(currentMonth, -3), shiftMonth(currentMonth, -2), shiftMonth(currentMonth, -1)];

  const lines = ["# Vendor Spend Report", ""];
  const spikes = [];
  for (const [vendor, months] of Object.entries(byVendorMonth)) {
    const current = months[currentMonth] || 0;
    const priorAvg = priorMonths.reduce((s, m) => s + (months[m] || 0), 0) / priorMonths.length;
    const changePct = priorAvg > 0 ? ((current - priorAvg) / priorAvg) * 100 : (current > 0 ? 100 : 0);
    if (changePct > spikeThreshold) spikes.push({ vendor, current, priorAvg, changePct });
    const total = Object.values(months).reduce((s, v) => s + v, 0);
    lines.push(`- **${vendor}**: total $${total.toLocaleString()} across ${Object.keys(months).length} month(s) with activity`);
  }

  lines.push("", `## Spend Spikes (this calendar month, ${currentMonth}, vs. trailing 3-month average)`, "");
  lines.push(spikes.length ? spikes.map((s) => `- ${s.vendor}: $${s.current.toFixed(0)} this month vs $${s.priorAvg.toFixed(0)} avg (+${s.changePct.toFixed(0)}%)`).join("\n") : "None.");

  await writeFile("vendor-spend-report.md", lines.join("\n") + "\n", "utf8");
  console.log(`${spikes.length} vendor spend spike(s) flagged.`);
  console.log("Wrote vendor-spend-report.md. Read-only — no transactions were modified.");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
