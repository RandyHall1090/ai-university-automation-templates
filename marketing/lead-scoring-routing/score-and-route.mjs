#!/usr/bin/env node
// Lead Scoring & Routing — weighted engagement score + round-robin or
// territory-based rep assignment. Weights and routing rules are entirely
// config-driven — edit weights.json, not this script. See README.md.

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

function scoreLead(lead, weights) {
  let score = 0;
  score += (Number(lead.email_opens) || 0) * (weights.email_opens ?? 0);
  score += (Number(lead.page_views) || 0) * (weights.page_views ?? 0);
  if (String(lead.demo_requested).toLowerCase() === "true") score += weights.demo_requested ?? 0;
  if ((Number(lead.company_size) || 0) > 50) score += weights.company_size_over_50 ?? 0;
  return score;
}

async function main() {
  const [, , leadsPath, weightsPath] = process.argv;
  if (!leadsPath || !weightsPath) {
    console.error("Usage: node score-and-route.mjs <leads.csv> <weights.json>");
    process.exit(1);
  }

  const leads = parseCsv(await readFile(leadsPath, "utf8"));
  const { weights, routing } = JSON.parse(await readFile(weightsPath, "utf8"));

  let rrIndex = 0;
  const scored = leads
    .map((lead) => ({ ...lead, score: scoreLead(lead, weights) }))
    .sort((a, b) => b.score - a.score)
    .map((lead) => {
      let assignedRep = "";
      if (routing.mode === "territory") {
        assignedRep = routing.territory_map[lead.territory] ?? "";
      } else {
        assignedRep = routing.reps[rrIndex % routing.reps.length];
        rrIndex++;
      }
      return { ...lead, assigned_rep: assignedRep };
    });

  const headers = [...Object.keys(leads[0] ?? {}), "score", "assigned_rep"];
  await writeFile("scored-leads.csv", toCsv(headers, scored), "utf8");

  console.log(`Scored and routed ${scored.length} leads.`);
  console.log("Wrote scored-leads.csv");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
