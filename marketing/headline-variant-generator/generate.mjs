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
  const escape = (v) => (String(v ?? "").includes(",") ? `"${v}"` : v ?? "");
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => escape(row[h])).join(","));
  return lines.join("\n") + "\n";
}

function variants(valueProp, audience) {
  return {
    benefit_led: `${valueProp}, built for ${audience}.`,
    question_led: `Struggling with this? Here's how ${audience} solve it.`,
    number_led: `3 ways ${audience} get more from ${valueProp.toLowerCase()}.`,
    urgency_led: `Don't let this hold you back — ${valueProp.toLowerCase()}, starting today.`,
  };
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: node generate.mjs <value-props.csv>");
    process.exit(1);
  }
  const rows = parseCsv(await readFile(input, "utf8"));
  const out = rows.map((r) => ({ page: r.page, ...variants(r.value_prop, r.audience) }));
  await writeFile("headline-variants.csv", toCsv(["page", "benefit_led", "question_led", "number_led", "urgency_led"], out), "utf8");
  console.log(`Generated variants for ${rows.length} pages.`);
  console.log("Wrote headline-variants.csv");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
