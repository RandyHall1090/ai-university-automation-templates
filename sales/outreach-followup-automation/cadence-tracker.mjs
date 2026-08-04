#!/usr/bin/env node
// Outreach & Follow-Up Automation — tells you who's due for the next
// cadence step today, and excludes anyone who has already replied.
// Does not send anything itself. See README.md before running.

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
  const escape = (v) => (String(v ?? "").includes(",") ? `"${v}"` : v ?? "");
  const lines = [headers.join(",")];
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

    // Find the latest step whose day_offset has arrived but hasn't been
    // superseded by a later step's offset — i.e. the step due "today".
    const due = sortedSteps.filter((s) => s.day_offset <= elapsed);
    if (!due.length) continue;
    const currentStep = due[due.length - 1];
    const isToday = currentStep.day_offset === elapsed || (!sortedSteps.find((s) => s.day_offset === elapsed + 1) && due.length === sortedSteps.filter((s) => s.day_offset <= elapsed).length);

    // Simplify: flag anyone whose most-recently-reached step's offset
    // equals today's elapsed count exactly — the common cadence semantics.
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
