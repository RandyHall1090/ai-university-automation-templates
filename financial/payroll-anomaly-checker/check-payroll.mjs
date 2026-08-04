#!/usr/bin/env node
// Flags only — never processes, submits, or approves payroll. See README.md.
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

// Normalizes an employee_id for matching across two exports: trims
// whitespace and strips leading zeros so "0042" and "42" are treated as
// the same employee instead of flagging every real employee as both
// new and removed just because the two payroll runs formatted IDs differently.
function normalizeId(id) {
  return String(id ?? "").trim().replace(/^0+(?=\d)/, "");
}

async function main() {
  const [, , currentPath, priorPath] = process.argv;
  if (!currentPath || !priorPath) {
    console.error("Usage: node check-payroll.mjs <current-payroll.csv> <prior-payroll.csv> [--change-threshold-pct=10]");
    process.exit(1);
  }
  const flag = process.argv.find((a) => a.startsWith("--change-threshold-pct="));
  const threshold = flag ? Number(flag.split("=")[1]) : 10;

  const current = parseCsv(await readFile(currentPath, "utf8"));
  const prior = parseCsv(await readFile(priorPath, "utf8"));
  const priorById = new Map(prior.map((p) => [normalizeId(p.employee_id), p]));
  const currentById = new Map(current.map((c) => [normalizeId(c.employee_id), c]));

  const newEmployees = current.filter((c) => !priorById.has(normalizeId(c.employee_id)));
  const removedEmployees = prior.filter((p) => !currentById.has(normalizeId(p.employee_id)));
  const payChanges = [];
  for (const c of current) {
    const p = priorById.get(normalizeId(c.employee_id));
    if (!p) continue;
    const priorPay = Number(p.gross_pay);
    if (!priorPay) continue;
    const changePct = ((Number(c.gross_pay) - priorPay) / priorPay) * 100;
    if (Math.abs(changePct) > threshold) payChanges.push({ ...c, prior_pay: p.gross_pay, change_pct: changePct.toFixed(1) });
  }

  const md = [
    "# Payroll Anomaly Report", "",
    `## New Employees (${newEmployees.length})`, "",
    newEmployees.length ? newEmployees.map((e) => `- ${e.name} (${e.employee_id}): $${e.gross_pay}`).join("\n") : "None.", "",
    `## Removed Employees (${removedEmployees.length})`, "",
    removedEmployees.length ? removedEmployees.map((e) => `- ${e.name} (${e.employee_id}): was $${e.gross_pay}`).join("\n") : "None.", "",
    `## Pay Changes > ${threshold}% (${payChanges.length})`, "",
    payChanges.length ? payChanges.map((e) => `- ${e.name}: $${e.prior_pay} → $${e.gross_pay} (${e.change_pct}%)`).join("\n") : "None.",
  ].join("\n");

  await writeFile("payroll-anomalies.md", md + "\n", "utf8");
  console.log(`${newEmployees.length} new, ${removedEmployees.length} removed, ${payChanges.length} pay change anomalies.`);
  console.log("Wrote payroll-anomalies.md. Review before approving in your payroll system — nothing was submitted.");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
