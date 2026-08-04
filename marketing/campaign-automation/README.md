# Campaign Automation

Defines a trigger → condition → action email/drip sequence and simulates it against a subscriber list, so you can see exactly which step each subscriber would be at before you wire it into a real ESP.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. Once you customize and run it, you own and operate it. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads a `sequence.json` (steps with a day-offset trigger and an optional condition) and a `subscribers.csv` (`id,email,signup_date,tag`, plus whatever fields your conditions reference). For each subscriber, finds the most recently reached step (not one landing on today's exact day count — a skipped day must not permanently drop a step), and evaluates its `condition` if present. Conditions support `=`, `!=`, `>`, `<`, `>=`, `<=`, and multiple clauses joined with `AND` (e.g. `"tag!=customer AND score>=50"`). A condition that can't be parsed **fails closed** (treated as not met) rather than silently sending. **This script does not send email** — it produces `simulated-sends.csv`, a dry-run showing exactly what would go out and to whom, so you can verify the sequence logic before connecting it to your real ESP.

## Adapt to your stack

Once you've verified the simulation looks right, wire the same step logic into your actual ESP (Mailchimp, HubSpot, ActiveCampaign, etc.) — most support a similar trigger/condition/action model natively, or you can call their send API directly from a modified version of this script using your own credentials.

## Run it

```bash
node simulate-sequence.mjs subscribers.csv sequence.json
```

A sample `sequence.example.json` is included. Requires only a stock Node.js install (18+), no dependencies.