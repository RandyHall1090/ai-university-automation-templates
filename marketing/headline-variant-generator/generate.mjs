#!/usr/bin/env node
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
  // A blank value_prop must not abort the entire run — skip that row and
  // keep going, since the other rows are still usable.
  const usable = rows.filter((r) => r.value_prop && r.value_prop.trim());
  const skipped = rows.length - usable.length;
  const out = usable.map((r) => ({ page: r.page, ...variants(r.value_prop, r.audience || "your audience") }));
  await writeFile("headline-variants.csv", toCsv(["page", "benefit_led", "question_led", "number_led", "urgency_led"], out), "utf8");
  console.log(`Generated variants for ${usable.length} pages${skipped ? ` (${skipped} row(s) skipped — missing value_prop)` : ""}.`);
  console.log("Wrote headline-variants.csv");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
