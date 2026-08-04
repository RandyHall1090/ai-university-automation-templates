#!/usr/bin/env node
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

async function main() {
  const [, , leadsPath, rulesPath] = process.argv;
  if (!leadsPath || !rulesPath) {
    console.error("Usage: node route-leads.mjs <scanned-leads.csv> <routing-rules.json>");
    process.exit(1);
  }
  const leads = parseCsv(await readFile(leadsPath, "utf8"));
  const { territory_map, interest_map } = JSON.parse(await readFile(rulesPath, "utf8"));

  const routed = leads.map((l) => ({
    ...l,
    assigned_rep: interest_map[l.interest_tag] || territory_map[l.territory] || "unassigned",
  }));

  await writeFile("routed-leads.csv", toCsv([...Object.keys(leads[0] ?? {}), "assigned_rep"], routed), "utf8");
  console.log(`Routed ${routed.length} leads (${routed.filter((r) => r.assigned_rep === "unassigned").length} unassigned).`);
  console.log("Wrote routed-leads.csv");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
