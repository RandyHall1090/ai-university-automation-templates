# Quota Attainment Tracker

Computes each rep's quota attainment percentage from closed-won deals for a period.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads `closed-won.csv` (`rep,amount,close_date`) and `quotas.csv` (`rep,quota,period`). Sums closed-won amount per rep and divides by their quota for that period. Outputs `attainment-report.md`, sorted from highest to lowest attainment.

## Adapt to your stack

Export closed-won deals from your CRM filtered to the period you're measuring, and pull quota figures from wherever comp plans live (a spreadsheet, your comp platform).

## Run it

```bash
node attainment.mjs closed-won.csv quotas.csv
```

Requires only a stock Node.js install (18+), no dependencies.