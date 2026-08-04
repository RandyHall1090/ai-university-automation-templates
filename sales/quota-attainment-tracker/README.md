# Quota Attainment Tracker

Computes each rep's quota attainment percentage from closed-won deals for a period.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads `closed-won.csv` (`rep,amount,close_date`) and `quotas.csv` (`rep,quota,period`). For each quota row, `period` is parsed as either `YYYY-QN` (e.g. `2026-Q1`) or `YYYY-MM` (e.g. `2026-03`), and only deals whose `close_date` falls inside that window count toward that rep's attainment — so a single `quotas.csv` covering multiple periods for the same rep works correctly instead of double-counting the same closed revenue against every row. A quota row with an unrecognized period format falls back to counting all of that rep's deals, and is called out in the report. Outputs `attainment-report.md`, sorted from highest to lowest attainment.

## Adapt to your stack

Export closed-won deals from your CRM with `close_date` populated, and pull quota figures (with a real `period` per row) from wherever comp plans live (a spreadsheet, your comp platform).

## Run it

```bash
node attainment.mjs closed-won.csv quotas.csv
```

Requires only a stock Node.js install (18+), no dependencies.