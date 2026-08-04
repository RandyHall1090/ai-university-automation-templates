# Outreach & Follow-Up Automation

Tracks prospects through a multi-step outreach cadence and figures out who's due for the next touch — and, critically, **exits the cadence automatically the moment a prospect replies**, so no one gets a follow-up email after they've already responded.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. Once you customize and run it, you own and operate it. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads two files:

- `cadence.json` — your sequence definition (step number, day offset, channel, subject/note)
- `prospects.csv` — one row per prospect with `id,name,email,cadence_start_date,replied,last_reply_date`

For each prospect still in the cadence (`replied` is false/empty), it finds the most recently reached step based on elapsed days since `cadence_start_date` — not one that lands on today's exact day count, since a skipped weekend or holiday must not permanently drop a step — and outputs `next-actions.csv` listing everyone on an active step today. Run it daily: a prospect keeps appearing on their current step until the next step's offset arrives. Anyone with `replied=true` is automatically excluded.

This script **does not send anything** — it tells you who to act on. Wire the output to your actual send mechanism (your ESP, your CRM's sequence tool, or a manual send) once you've reviewed it.

## Adapt to your stack

Export `replied`/`last_reply_date` from wherever you track inbound replies (your inbox, your CRM's activity timeline, or your ESP's reply tracking). Edit `cadence.json` to match your actual sequence — add/remove steps, change day offsets, channels, or notes freely.

## Run it

```bash
node cadence-tracker.mjs prospects.csv cadence.json
```

A sample `cadence.example.json` is included — copy it to `cadence.json` and edit. Requires only a stock Node.js install (18+), no dependencies.