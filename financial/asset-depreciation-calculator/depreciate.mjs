#!/usr/bin/env node
// Reporting only — does not post any journal entry. See README.md.
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

function monthsSince(dateStr) {
  const d = new Date(dateStr);
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
    const elapsedYears = elapsedMonths / 12;
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
  console.log(`${schedule.filter((s) => s.eol_warning === "yes").length} asset(s) nearing end of useful life.`);
  console.log("Wrote depreciation-schedule.csv. Reporting only — no journal entry was posted.");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
