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

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: node segment.mjs <registrants.csv> [--webinar-length-minutes=45]");
    process.exit(1);
  }
  const flag = process.argv.find((a) => a.startsWith("--webinar-length-minutes="));
  const length = flag ? Number(flag.split("=")[1]) : 45;

  const regs = parseCsv(await readFile(input, "utf8"));
  const tasks = regs.map((r) => {
    const attended = String(r.attended).toLowerCase() === "true";
    const watchTime = Number(r.watch_time_minutes) || 0;
    let segment, action;
    if (!attended) {
      segment = "no_show";
      action = "Send recording + re-invite to next session";
    } else if (watchTime >= length * 0.75) {
      segment = "attended_full";
      action = "Send recording + demo/next-step offer";
    } else {
      segment = "attended_partial";
      action = "Send recording + highlight the parts they missed";
    }
    return { email: r.email, name: r.name, segment, action };
  });

  await writeFile("followup-tasks.csv", toCsv(["email", "name", "segment", "action"], tasks), "utf8");
  console.log(`Segmented ${regs.length} registrants.`);
  console.log("Wrote followup-tasks.csv");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
