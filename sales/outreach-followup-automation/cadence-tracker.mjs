#!/usr/bin/env node
// Outreach & Follow-Up Automation — tells you who's due for the next
// cadence step today, and excludes anyone who has already replied.
// Does not send anything itself. See README.md before running.

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

async function main() {
  const [, , prospectsPath, cadencePath] = process.argv;
  if (!prospectsPath || !cadencePath) {
    console.error("Usage: node cadence-tracker.mjs <prospects.csv> <cadence.json>");
    process.exit(1);
  }

  const prospects = parseCsv(await readFile(prospectsPath, "utf8"));
  const { steps } = JSON.parse(await readFile(cadencePath, "utf8"));
  const sortedSteps = [...steps].sort((a, b) => a.day_offset - b.day_offset);

  const actions = [];
  let excludedForReply = 0;

  for (const p of prospects) {
    const replied = String(p.replied).toLowerCase() === "true";
    if (replied) {
      excludedForReply++;
      continue;
    }

    const elapsed = daysSince(p.cadence_start_date);
    if (elapsed === null) continue;

    const due = sortedSteps.filter((s) => s.day_offset <= elapsed);
    if (!due.length) continue;
    const currentStep = due[due.length - 1];

    if (currentStep.day_offset === elapsed) {
      actions.push({
        id: p.id,
        name: p.name,
        email: p.email,
        step: currentStep.step,
        channel: currentStep.channel,
        note: currentStep.note,
      });
    }
  }

  const outHeaders = ["id", "name", "email", "step", "channel", "note"];
  await writeFile("next-actions.csv", toCsv(outHeaders, actions), "utf8");

  console.log(`${prospects.length} prospects checked — ${excludedForReply} excluded (already replied) — ${actions.length} due for action today.`);
  console.log("Wrote next-actions.csv");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
