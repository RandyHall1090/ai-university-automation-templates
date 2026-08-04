# Competitor Mention Tracker

Scans deal notes or call transcripts for competitor name mentions and tallies frequency, giving you a lightweight competitive-intelligence signal without any manual tagging.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads `deal-notes.csv` (`deal_id,note_text`) and `competitors.json` (a plain list of competitor names/aliases you maintain). Case-insensitive substring-matches each note against the list, and outputs `competitor-mentions.csv` (deal_id, competitor, mention count) plus a rollup in `competitor-summary.md`.

## Adapt to your stack

Export deal notes/call summaries from your CRM. Keep `competitors.json` current as you learn about new competitors in deals.

## Run it

```bash
node track-mentions.mjs deal-notes.csv competitors.json
```

A sample `competitors.example.json` is included. Requires only a stock Node.js install (18+), no dependencies.