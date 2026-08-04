# Ad Budget Pacing Monitor

Tracks ad spend against monthly budget pacing and flags campaigns running over or under pace before the month closes out.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads `spend.csv` (`campaign,month_to_date_spend,monthly_budget,day_of_month,days_in_month`). Computes expected spend-to-date based on straight-line pacing, compares to actual, and flags campaigns more than `--tolerance-pct` (default 15%) off pace in either direction. Outputs `pacing-report.md`.

## Adapt to your stack

Export spend-to-date from your ad platforms (Google Ads, Meta, LinkedIn Ads) — most support a scheduled CSV export or an API pull you can wire in later. This template does not connect to any ad platform directly; it works from your export.

## Run it

```bash
node monitor-pacing.mjs spend.csv --tolerance-pct=15
```

Requires only a stock Node.js install (18+), no dependencies.