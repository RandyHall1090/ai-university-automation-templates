#!/usr/bin/env node
// Flags only — never processes, submits, or approves payroll. See README.md.
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
  const [, , currentPath, priorPath] = process.argv;
  if (!currentPath || !priorPath) {
    console.error("Usage: node check-payroll.mjs <current-payroll.csv> <prior-payroll.csv> [--change-threshold-pct=10]");
    process.exit(1);
  }
  const flag = process.argv.find((a) => a.startsWith("--change-threshold-pct="));
  const threshold = flag ? Number(flag.split("=")[1]) : 10;

  const current = parseCsv(await readFile(currentPath, "utf8"));
  const prior = parseCsv(await readFile(priorPath, "utf8"));
  const priorById = new Map(prior.map((p) => [p.employee_id, p]));
  const currentById = new Map(current.map((c) => [c.employee_id, c]));

  const newEmployees = current.filter((c) => !priorById.has(c.employee_id));
  const removedEmployees = prior.filter((p) => !currentById.has(p.employee_id));
  const payChanges = [];
  for (const c of current) {
    const p = priorById.get(c.employee_id);
    if (!p) continue;
    const changePct = ((Number(c.gross_pay) - Number(p.gross_pay)) / Number(p.gross_pay)) * 100;
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
