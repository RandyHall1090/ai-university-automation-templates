#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: node check-list.mjs <subscribers.csv> [--inactive-days=365] [--bounce-threshold=3]");
    process.exit(1);
  }
  const inactiveFlag = process.argv.find((a) => a.startsWith("--inactive-days="));
  const bounceFlag = process.argv.find((a) => a.startsWith("--bounce-threshold="));
  const inactiveDays = inactiveFlag ? Number(inactiveFlag.split("=")[1]) : 365;
  const bounceThreshold = bounceFlag ? Number(bounceFlag.split("=")[1]) : 3;

  const subs = parseCsv(await readFile(input, "utf8"));
  const flagged = subs.map((s) => {
    const flags = [];
    if (!EMAIL_RE.test(s.email)) flags.push("malformed_email");
    if ((Number(s.bounce_count) || 0) >= bounceThreshold) flags.push("high_bounce_count");
    const age = daysSince(s.last_open_date);
    if (age !== null && age > inactiveDays) flags.push(`inactive_${age}d`);
    return { ...s, flags: flags.join("|") };
  }).filter((s) => s.flags);

  await writeFile("list-hygiene-flags.csv", toCsv([...Object.keys(subs[0] ?? {}), "flags"], flagged), "utf8");
  console.log(`${flagged.length} of ${subs.length} subscribers flagged. No one was unsubscribed automatically.`);
  console.log("Wrote list-hygiene-flags.csv");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
