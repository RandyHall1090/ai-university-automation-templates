#!/usr/bin/env node
// Calculates rewards owed only — never issues a payment/credit. See README.md.
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
  const [, , refPath, rulesPath] = process.argv;
  if (!refPath || !rulesPath) {
    console.error("Usage: node calculate-rewards.mjs <referrals.csv> <reward-rules.json>");
    process.exit(1);
  }
  const referrals = parseCsv(await readFile(refPath, "utf8"));
  const { reward_per_conversion, max_reward_per_referrer } = JSON.parse(await readFile(rulesPath, "utf8"));

  const converted = referrals.filter((r) => String(r.converted).toLowerCase() === "true");
  const byReferrer = {};
  for (const r of converted) byReferrer[r.referrer_email] = (byReferrer[r.referrer_email] || 0) + 1;

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
