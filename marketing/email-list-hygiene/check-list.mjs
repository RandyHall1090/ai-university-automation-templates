#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALREADY_ACTIONED_STATUSES = ["unsubscribed", "complained", "bounced"];

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
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => row[h] ?? "").join(","));
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
    const status = (s.status || "").trim().toLowerCase();
    // Already-unsubscribed/complained/bounced contacts have already been
    // actioned by the ESP — don't re-flag them as if there's something
    // left for a human to do.
    if (ALREADY_ACTIONED_STATUSES.includes(status)) return { ...s, flags: "" };

    const flags = [];
    if (!EMAIL_RE.test(s.email)) flags.push("malformed_email");
    if ((Number(s.bounce_count) || 0) >= bounceThreshold) flags.push("high_bounce_count");
    const age = daysSince(s.last_open_date);
    // A subscriber who has NEVER opened anything (blank/invalid
    // last_open_date) is the highest-priority hygiene target — flag them,
    // don't silently skip them.
    if (age === null) flags.push("never_opened_or_invalid_date");
    else if (age > inactiveDays) flags.push(`inactive_${age}d`);
    return { ...s, flags: flags.join("|") };
  }).filter((s) => s.flags);

  await writeFile("list-hygiene-flags.csv", toCsv([...Object.keys(subs[0] ?? {}), "flags"], flagged), "utf8");
  console.log(`${flagged.length} of ${subs.length} subscribers flagged. No one was unsubscribed automatically.`);
  console.log("Wrote list-hygiene-flags.csv");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
