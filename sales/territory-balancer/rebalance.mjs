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
    const capacity = Number(r.capacity);
    // A blank/zero/non-numeric capacity must not produce NaN in the sort
    // comparator below (implementation-defined ordering) — treat it as zero
    // capacity, i.e. this rep gets nothing until their config is fixed.
    byTerritory[r.territory].push({ email: r.rep_email, capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : 0, load: 0 });
  }

  // Hard cap: once a rep is at capacity, stop assigning them accounts.
  // If every rep in a territory is full, the account stays with its current
  // owner and is flagged — it does NOT get force-assigned past anyone's
  // stated capacity just because their ratio is momentarily lowest.
  const result = accounts.map((acc) => {
    const territoryPool = byTerritory[acc.territory] || [];
    const available = territoryPool.filter((r) => r.load < r.capacity);
    if (!available.length) {
      return {
        ...acc,
        new_owner: acc.current_owner,
        reason: territoryPool.length ? "no_capacity_available" : "no_reps_in_territory",
      };
    }
    available.sort((a, b) => a.load / a.capacity - b.load / b.capacity);
    const chosen = available[0];
    chosen.load++;
    return { ...acc, new_owner: chosen.email, reason: chosen.email === acc.current_owner ? "unchanged" : "rebalanced" };
  });

  await writeFile("rebalanced-assignments.csv", toCsv(["id", "name", "current_owner", "territory", "new_owner", "reason"], result), "utf8");
  console.log(`Proposed reassignment for ${result.filter((r) => r.reason === "rebalanced").length} of ${accounts.length} accounts (${result.filter((r) => r.reason === "no_capacity_available").length} left unassigned — territory at full capacity).`);
  console.log("Wrote rebalanced-assignments.csv — review before applying to your CRM.");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
