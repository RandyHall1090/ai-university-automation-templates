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
    console.error("Usage: node summarize-transcript.mjs <call-transcript.txt> [--speaker-label=Rep]");
    process.exit(1);
  }
  const labelFlag = process.argv.find((a) => a.startsWith("--speaker-label="));
  const speakerLabel = (labelFlag ? labelFlag.split("=")[1] : "Rep").toLowerCase();

  const text = await readFile(path, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());

  const actionItems = [];
  const datesFound = new Set();
  let sawSpeakerLabels = false;

  for (const line of lines) {
    // If the transcript uses "Speaker: text" lines, only capture commitments
    // from --speaker-label (default "Rep") — otherwise a prospect saying
    // "I'll think about it" gets misattributed as YOUR action item. If no
    // speaker labels appear anywhere, fall back to scanning every line.
    const speakerMatch = line.match(/^([^:]{1,40}):\s*(.*)$/);
    const speaker = speakerMatch ? speakerMatch[1].trim().toLowerCase() : null;
    if (speaker) sawSpeakerLabels = true;
    const isOwnLine = !sawSpeakerLabels || speaker === speakerLabel;

    const lower = line.toLowerCase();
    if (isOwnLine && COMMITMENT_PHRASES.some((p) => lower.includes(p))) {
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
    datesFound.size ? Array.from(datesFound).map((d) => `- ${d}`).join("\n") : "- None detected. Note: dates without a year (e.g. \"August 3\") are extracted as-is — confirm the intended year yourself.",
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
