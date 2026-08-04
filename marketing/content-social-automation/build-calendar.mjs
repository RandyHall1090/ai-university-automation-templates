#!/usr/bin/env node
// Content & Social Automation — builds a rotating content calendar and
// rule-based caption variants. No AI call by default — see README.md for
// how to swap in your own provider for real generative captions.

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

function generateVariants(topic) {
  return {
    short: `${topic} — here's what you need to know.`,
    long: `Let's talk about ${topic}. It's something we hear about constantly, and getting it right makes a real difference. Here's our take, and what we've learned from doing it ourselves.`,
    cta: `Want to get ${topic} right? See how in the link below.`,
  };
}

function parseArgs(argv) {
  const input = argv[2];
  if (!input) {
    console.error("Usage: node build-calendar.mjs <topics.csv> [--weeks=4] [--posts-per-week=3]");
    process.exit(1);
  }
  const weeksFlag = argv.find((a) => a.startsWith("--weeks="));
  const ppwFlag = argv.find((a) => a.startsWith("--posts-per-week="));
  return {
    input,
    weeks: weeksFlag ? Number(weeksFlag.split("=")[1]) : 4,
    postsPerWeek: ppwFlag ? Number(ppwFlag.split("=")[1]) : 3,
  };
}

async function main() {
  const { input, weeks, postsPerWeek } = parseArgs(process.argv);
  const topics = parseCsv(await readFile(input, "utf8"));
  if (!topics.length) {
    console.error("No topics found in input file.");
    process.exit(1);
  }

  const totalSlots = weeks * postsPerWeek;
  const calendar = [];
  for (let i = 0; i < totalSlots; i++) {
    const topic = topics[i % topics.length];
    const week = Math.floor(i / postsPerWeek) + 1;
    const dayInWeek = (i % postsPerWeek) + 1;
    const variants = generateVariants(topic.topic);
    calendar.push({
      week,
      slot_in_week: dayInWeek,
      topic: topic.topic,
      channel: topic.channel,
      caption_short: variants.short,
      caption_long: variants.long,
      caption_cta: variants.cta,
    });
  }

  const headers = ["week", "slot_in_week", "topic", "channel", "caption_short", "caption_long", "caption_cta"];
  await writeFile("content-calendar.csv", toCsv(headers, calendar), "utf8");

  console.log(`Generated ${calendar.length} scheduled posts across ${weeks} weeks.`);
  console.log("Wrote content-calendar.csv");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
