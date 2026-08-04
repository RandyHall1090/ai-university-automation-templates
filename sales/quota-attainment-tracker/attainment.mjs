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

// Parses a period string into a [start, end) UTC date range so deals can be
// filtered to the quota's actual window instead of counting every closed
// deal against every period row for a rep. Supports "YYYY-QN" and "YYYY-MM".
function periodRange(period) {
  const q = String(period ?? "").match(/^(\d{4})-Q([1-4])$/i);
  if (q) {
    const year = Number(q[1]);
    const startMonth = (Number(q[2]) - 1) * 3;
    return { start: Date.UTC(year, startMonth, 1), end: Date.UTC(year, startMonth + 3, 1) };
  }
  const m = String(period ?? "").match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]) - 1;
    return { start: Date.UTC(year, month, 1), end: Date.UTC(year, month + 1, 1) };
  }
  return null;
}

async function main() {
  const [, , dealsPath, quotasPath] = process.argv;
  if (!dealsPath || !quotasPath) {
    console.error("Usage: node attainment.mjs <closed-won.csv> <quotas.csv>");
    process.exit(1);
  }
  const deals = parseCsv(await readFile(dealsPath, "utf8"));
  const quotas = parseCsv(await readFile(quotasPath, "utf8"));

  let unrecognizedPeriods = 0;
  const rows = quotas.map((q) => {
    const range = periodRange(q.period);
    if (!range) unrecognizedPeriods++;
    const repDeals = deals.filter((d) => {
      if (d.rep !== q.rep) return false;
      if (!range) return true; // unrecognized period format: fall back to all of the rep's deals
      const closeTime = new Date(d.close_date).getTime();
      return !Number.isNaN(closeTime) && closeTime >= range.start && closeTime < range.end;
    });
    const closed = repDeals.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const quota = Number(q.quota) || 0;
    const pct = quota > 0 ? (closed / quota) * 100 : null;
    return { rep: q.rep, period: q.period, quota, closed, pct };
  }).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));

  const md = ["# Quota Attainment Report", "", "| Rep | Period | Quota | Closed | Attainment |", "|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.rep} | ${r.period} | $${r.quota.toLocaleString()} | $${r.closed.toLocaleString()} | ${r.pct === null ? "n/a (quota is 0)" : r.pct.toFixed(1) + "%"} |`)].join("\n");

  await writeFile("attainment-report.md", md + (unrecognizedPeriods ? `\n\n${unrecognizedPeriods} quota row(s) had an unrecognized period format (expected YYYY-QN or YYYY-MM) — counted against ALL of that rep's closed deals instead of the period window.\n` : "\n"), "utf8");
  console.log("Wrote attainment-report.md");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
