# Vendor Spend Analyzer

Aggregates spend by vendor over time and flags sudden spend spikes — read-only reporting, no ability to touch a payment.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer. **Read-only by design — never writes, posts, initiates, or moves money.**

## What it does

Reads `transactions.csv` (`date,vendor,amount`). Rolls spend up by vendor and by month, and flags any vendor whose current-month spend exceeds their trailing-3-month average by more than `--spike-threshold-pct` (default 50%). Outputs `vendor-spend-report.md`.

## Adapt to your stack

Export transaction/AP data from your accounting platform.

## Run it

```bash
node analyze-spend.mjs transactions.csv --spike-threshold-pct=50
```

Requires only a stock Node.js install (18+), no dependencies.