#!/usr/bin/env node
// Pipeline Health Dashboard — rolls a CRM deal export up into stage
// counts/value, average age per stage, stalled deals, and win rate.
// See README.md before running.

import { readFile, writeFile } from "node:fs/promises";

const REQUIRED_COLUMNS = ["id", "name", "stage", "amount", "owner", "created_date", "stage_updated_date", "closed_date", "outcome"];

function parseArgs(argv) {
  const input = argv[2];
  if (!input) {
    console.error("Usage: node pipeline-report.mjs <deals.csv> [--stalled-days=30]");
    process.exit(1);
  }
  const flag = argv.find((a) => a.startsWith("--stalled-days="));
  return { input, stalledDays: flag ? Number(flag.split("=")[1]) : 30 };
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map((h) => h.trim());
  return { headers, rows: lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row = {};
    headers.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row;
  }) };
}

function daysSince(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

async function main() {
  const { input, stalledDays } = parseArgs(process.argv);
  const text = await readFile(input, "utf8");
  const { headers, rows } = parseCsv(text);

  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length) {
    console.error(`Input is missing expected columns: ${missing.join(", ")}`);
    process.exit(1);
  }

  const open = rows.filter((r) => !r.outcome);
  const closed = rows.filter((r) => r.outcome === "won" || r.outcome === "lost");
  const won = closed.filter((r) => r.outcome === "won");

  const byStage = {};
  for (const r of open) {
    const stage = r.stage || "(no stage)";
    byStage[stage] ??= { count: 0, value: 0, ageSum: 0 };
    byStage[stage].count++;
    byStage[stage].value += Number(r.amount) || 0;
    byStage[stage].ageSum += daysSince(r.stage_updated_date || r.created_date) ?? 0;
  }

  const stalled = open.filter((r) => (daysSince(r.stage_updated_date || r.created_date) ?? 0) >= stalledDays);
  const winRate = closed.length ? (won.length / closed.length) * 100 : null;

  const stageLines = Object.entries(byStage).map(
    ([stage, s]) => `| ${stage} | ${s.count} | $${s.value.toLocaleString()} | ${(s.ageSum / s.count).toFixed(1)} |`
  );

  const md = [
    "# Pipeline Health Report",
    "",
    "## By Stage",
    "",
    "| Stage | Deals | Total Value | Avg Days In Stage |",
    "|---|---|---|---|",
    ...stageLines,
    "",
    `## Stalled Deals (no stage movement in ${stalledDays}+ days)`,
    "",
    stalled.length ? stalled.map((r) => `- ${r.name} (${r.stage}, $${r.amount}, owner: ${r.owner})`).join("\n") : "None.",
    "",
    "## Win Rate",
    "",
    winRate === null ? "No closed deals in this export." : `${winRate.toFixed(1)}% (${won.length} won / ${closed.length} closed)`,
  ].join("\n");

  const json = {
    by_stage: byStage,
    stalled_count: stalled.length,
    stalled_deal_ids: stalled.map((r) => r.id),
    win_rate_pct: winRate,
    closed_count: closed.length,
    won_count: won.length,
  };

  await writeFile("pipeline-report.md", md + "\n", "utf8");
  await writeFile("pipeline-report.json", JSON.stringify(json, null, 2), "utf8");

  console.log(`Analyzed ${rows.length} deals (${open.length} open, ${closed.length} closed).`);
  console.log("Wrote pipeline-report.md and pipeline-report.json");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
