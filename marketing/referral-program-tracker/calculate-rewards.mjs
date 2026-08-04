#!/usr/bin/env node
// Calculates rewards owed only — never issues a payment/credit. See README.md.
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
  const [, , refPath, rulesPath] = process.argv;
  if (!refPath || !rulesPath) {
    console.error("Usage: node calculate-rewards.mjs <referrals.csv> <reward-rules.json>");
    process.exit(1);
  }
  const referrals = parseCsv(await readFile(refPath, "utf8"));
  const { reward_per_conversion, max_reward_per_referrer } = JSON.parse(await readFile(rulesPath, "utf8"));

  const converted = referrals.filter((r) => String(r.converted).toLowerCase() === "true");

  // Lowercase the referrer key (every other email-keyed script in this repo
  // does this) so "Bob@x.com" and "bob@x.com" aren't treated as different
  // people — that would let one person clear the per-referrer cap twice.
  // Also dedupe by referred_email per referrer, so the same referred
  // contact appearing twice in the export (a common export artifact) isn't
  // paid out twice.
  const seenReferredByReferrer = new Map();
  const byReferrer = {};
  for (const r of converted) {
    const referrer = (r.referrer_email || "").toLowerCase().trim();
    if (!referrer) continue;
    const referred = (r.referred_email || "").toLowerCase().trim();
    const seen = seenReferredByReferrer.get(referrer) ?? new Set();
    if (referred && seen.has(referred)) continue;
    if (referred) seen.add(referred);
    seenReferredByReferrer.set(referrer, seen);
    byReferrer[referrer] = (byReferrer[referrer] || 0) + 1;
  }

  const owed = Object.entries(byReferrer).map(([email, count]) => {
    const raw = count * reward_per_conversion;
    const capped = Math.min(raw, max_reward_per_referrer ?? raw);
    return { referrer_email: email, converted_referrals: count, reward_owed: capped, capped: capped < raw };
  });

  await writeFile("rewards-owed.csv", toCsv(["referrer_email", "converted_referrals", "reward_owed", "capped"], owed), "utf8");
  console.log(`${owed.length} referrers owed rewards. No payments were issued — this is a calculation only.`);
  console.log("Wrote rewards-owed.csv");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
