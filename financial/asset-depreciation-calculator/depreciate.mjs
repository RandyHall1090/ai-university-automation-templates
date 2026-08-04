#!/usr/bin/env node
// Reporting only — does not post any journal entry. See README.md.
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

// Returns null (not NaN) for an invalid date, so callers can distinguish
// "can't compute" from a real elapsed-time value of zero.
function monthsSince(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: node depreciate.mjs <assets.csv> [--eol-warning-months=6]");
    process.exit(1);
  }
  const flag = process.argv.find((a) => a.startsWith("--eol-warning-months="));
  const eolWarning = flag ? Number(flag.split("=")[1]) : 6;

  const assets = parseCsv(await readFile(input, "utf8"));
  const schedule = assets.map((a) => {
    const cost = Number(a.cost) || 0;
    const salvage = Number(a.salvage_value) || 0;
    const lifeYears = Number(a.useful_life_years) || 1;
    const annualDepreciation = (cost - salvage) / lifeYears;
    const elapsedMonths = monthsSince(a.purchase_date);

    if (elapsedMonths === null) {
      // Invalid/blank purchase_date: report this explicitly rather than
      // silently computing NaN book values and a false "not near end of life".
      return {
        asset_id: a.asset_id, name: a.name, cost, annual_depreciation: annualDepreciation.toFixed(2),
        book_value: "n/a", months_remaining: "n/a", eol_warning: "invalid_purchase_date",
      };
    }

    // A future purchase_date must not produce negative depreciation — clamp
    // elapsed time to zero rather than letting book_value exceed cost.
    const elapsedYears = Math.max(elapsedMonths, 0) / 12;
    const accumulatedDepreciation = Math.min(annualDepreciation * elapsedYears, cost - salvage);
    const bookValue = cost - accumulatedDepreciation;
    const monthsRemaining = lifeYears * 12 - elapsedMonths;
    return {
      asset_id: a.asset_id, name: a.name, cost, annual_depreciation: annualDepreciation.toFixed(2),
      book_value: Math.max(bookValue, salvage).toFixed(2), months_remaining: monthsRemaining,
      eol_warning: monthsRemaining <= eolWarning ? "yes" : "no",
    };
  });

  await writeFile("depreciation-schedule.csv", toCsv(["asset_id", "name", "cost", "annual_depreciation", "book_value", "months_remaining", "eol_warning"], schedule), "utf8");
  console.log(`${schedule.filter((s) => s.eol_warning === "yes").length} asset(s) nearing end of useful life, ${schedule.filter((s) => s.eol_warning === "invalid_purchase_date").length} with an invalid purchase_date.`);
  console.log("Wrote depreciation-schedule.csv. Reporting only — no journal entry was posted.");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
