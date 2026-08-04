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
  const [, , accPath, repPath] = process.argv;
  if (!accPath || !repPath) {
    console.error("Usage: node rebalance.mjs <accounts.csv> <reps.csv>");
    process.exit(1);
  }
  const accounts = parseCsv(await readFile(accPath, "utf8"));
  const reps = parseCsv(await readFile(repPath, "utf8"));

  const byTerritory = {};
  for (const r of reps) {
    byTerritory[r.territory] ??= [];
    byTerritory[r.territory].push({ email: r.rep_email, capacity: Number(r.capacity), load: 0 });
  }

  const result = accounts.map((acc) => {
    const pool = byTerritory[acc.territory];
    if (!pool || !pool.length) return { ...acc, new_owner: acc.current_owner, reason: "no_reps_in_territory" };
    pool.sort((a, b) => a.load / a.capacity - b.load / b.capacity);
    const chosen = pool[0];
    chosen.load++;
    return { ...acc, new_owner: chosen.email, reason: chosen.email === acc.current_owner ? "unchanged" : "rebalanced" };
  });

  await writeFile("rebalanced-assignments.csv", toCsv(["id", "name", "current_owner", "territory", "new_owner", "reason"], result), "utf8");
  console.log(`Proposed reassignment for ${result.filter((r) => r.reason === "rebalanced").length} of ${accounts.length} accounts.`);
  console.log("Wrote rebalanced-assignments.csv — review before applying to your CRM.");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
