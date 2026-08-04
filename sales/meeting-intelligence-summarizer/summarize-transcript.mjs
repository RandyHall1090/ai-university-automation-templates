#!/usr/bin/env node
// Meeting Intelligence Summarizer — rule-based extraction of action items
// and dates from a speaker-labeled transcript. Sentiment is deliberately
// left as a human-review placeholder, not guessed. See README.md.

import { readFile, writeFile } from "node:fs/promises";

const COMMITMENT_PHRASES = [
  "i will", "i'll", "we'll", "we will", "follow up", "follow-up",
  "next step", "send you", "send over", "i can get you", "let me get you",
];

const DATE_RE = /\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}|(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(st|nd|rd|th)?|next (week|monday|tuesday|wednesday|thursday|friday))\b/gi;

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: node summarize-transcript.mjs <call-transcript.txt>");
    process.exit(1);
  }

  const text = await readFile(path, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());

  const actionItems = [];
  const datesFound = new Set();

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (COMMITMENT_PHRASES.some((p) => lower.includes(p))) {
      actionItems.push(line.trim());
    }
    const matches = line.match(DATE_RE);
    if (matches) matches.forEach((m) => datesFound.add(m));
  }

  const summary = {
    source_file: path,
    action_items: actionItems,
    mentioned_dates: Array.from(datesFound),
    sentiment: "human-review-needed",
    line_count: lines.length,
  };

  const crmSnippet = [
    "## Call Summary",
    "",
    "**Action Items:**",
    actionItems.length ? actionItems.map((a) => `- ${a}`).join("\n") : "- None detected — review transcript manually.",
    "",
    "**Dates Mentioned:**",
    datesFound.size ? Array.from(datesFound).map((d) => `- ${d}`).join("\n") : "- None detected.",
    "",
    "**Sentiment:** _human review needed — not auto-assessed_",
  ].join("\n");

  await writeFile("meeting-summary.json", JSON.stringify(summary, null, 2), "utf8");
  await writeFile("crm-update.md", crmSnippet + "\n", "utf8");

  console.log(`Found ${actionItems.length} action item(s), ${datesFound.size} date(s).`);
  console.log("Wrote meeting-summary.json and crm-update.md");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
