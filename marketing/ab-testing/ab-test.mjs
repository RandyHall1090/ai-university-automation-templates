#!/usr/bin/env node
// A/B Test Runner — two-proportion z-test for statistical significance.
// Reports "not yet significant" rather than forcing a winner call on thin
// data. See README.md before running.

import { readFile } from "node:fs/promises";

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

function zTest(a, b) {
  const p1 = a.conversions / a.visitors;
  const p2 = b.conversions / b.visitors;
  const pPool = (a.conversions + b.conversions) / (a.visitors + b.visitors);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / a.visitors + 1 / b.visitors));
  if (se === 0) return { z: 0, p1, p2 };
  return { z: (p1 - p2) / se, p1, p2 };
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: node ab-test.mjs <results.csv>");
    process.exit(1);
  }

  const rows = parseCsv(await readFile(path, "utf8")).map((r) => ({
    variant: r.variant,
    visitors: Number(r.visitors),
    conversions: Number(r.conversions),
  }));

  const withRate = rows
    .map((r) => ({ ...r, rate: r.conversions / r.visitors }))
    .sort((a, b) => b.rate - a.rate);

  console.log("Conversion rates:");
  for (const r of withRate) {
    console.log(`  ${r.variant}: ${(r.rate * 100).toFixed(2)}% (${r.conversions}/${r.visitors})`);
  }

  if (withRate.length < 2) {
    console.log("\nNeed at least 2 variants to run a significance test.");
    return;
  }

  const [top, second] = withRate;
  const { z } = zTest(top, second);
  const significant = Math.abs(z) >= 1.96;

  console.log(`\nz-score (${top.variant} vs ${second.variant}): ${z.toFixed(3)}`);
  if (significant) {
    console.log(`Result: statistically significant at 95% confidence — ${top.variant} is the real winner.`);
  } else {
    console.log(`Result: NOT yet statistically significant. Keep the test running — don't call a winner yet.`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
