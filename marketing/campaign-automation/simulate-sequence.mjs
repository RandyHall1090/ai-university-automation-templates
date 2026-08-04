#!/usr/bin/env node
// Campaign Automation — dry-run simulator for a trigger/condition/action
// email sequence. Never sends anything; produces a preview of what would
// send today for each subscriber. See README.md before running.

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

function daysSince(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

// Supports multiple AND-joined clauses and =, !=, >, <, >=, <= operators.
// A clause that can't be parsed FAILS CLOSED (condition not met) — the
// prior version treated an unparseable condition as met, which showed a
// send the real ESP would have suppressed.
function conditionMet(condition, subscriber) {
  if (!condition) return true;
  const clauses = condition.split(/\s+AND\s+/i);
  return clauses.every((clause) => {
    const m = clause.trim().match(/^(\w+)\s*(!=|>=|<=|=|>|<)\s*(.+)$/);
    if (!m) return false;
    const [, field, op, rawValue] = m;
    const actual = subscriber[field] ?? "";
    const value = rawValue.trim();
    const numActual = Number(actual);
    const numValue = Number(value);
    const bothNumeric = actual !== "" && value !== "" && !Number.isNaN(numActual) && !Number.isNaN(numValue);
    switch (op) {
      case "!=": return actual !== value;
      case "=": return actual === value;
      case ">": return bothNumeric ? numActual > numValue : actual > value;
      case "<": return bothNumeric ? numActual < numValue : actual < value;
      case ">=": return bothNumeric ? numActual >= numValue : actual >= value;
      case "<=": return bothNumeric ? numActual <= numValue : actual <= value;
      default: return false;
    }
  });
}

async function main() {
  const [, , subsPath, seqPath] = process.argv;
  if (!subsPath || !seqPath) {
    console.error("Usage: node simulate-sequence.mjs <subscribers.csv> <sequence.json>");
    process.exit(1);
  }

  const subscribers = parseCsv(await readFile(subsPath, "utf8"));
  const { steps } = JSON.parse(await readFile(seqPath, "utf8"));
  const sorted = [...steps].sort((a, b) => a.day_offset - b.day_offset);

  const sends = [];
  for (const sub of subscribers) {
    const elapsed = daysSince(sub.signup_date);
    if (elapsed === null) continue;
    // Most recently reached step, not one landing on today's exact day count
    // — a skipped day must not permanently drop a step. See README.
    const due = sorted.filter((s) => s.day_offset <= elapsed);
    if (!due.length) continue;
    const step = due[due.length - 1];
    if (!conditionMet(step.condition, sub)) continue;
    sends.push({ id: sub.id, email: sub.email, step: step.step, subject: step.subject });
  }

  await writeFile("simulated-sends.csv", toCsv(["id", "email", "step", "subject"], sends), "utf8");
  console.log(`${subscribers.length} subscribers checked — ${sends.length} would receive a send today.`);
  console.log("Wrote simulated-sends.csv");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
