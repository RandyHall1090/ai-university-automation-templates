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
