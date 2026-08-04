# Vendor Concentration Risk Flagger

Flags when spend with a single vendor represents an outsized share of total spend — a real operational risk (single point of failure) worth surfacing, reporting-only.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer. **Read-only by design — never writes, posts, initiates, or moves money.**

## What it does

Reads `transactions.csv` (`vendor,amount`). Computes each vendor's share of total spend and flags any vendor above `--concentration-threshold-pct` (default 25%). Outputs `vendor-concentration-report.md`.

## Adapt to your stack

Export transaction/AP data for the period you're assessing (typically trailing 12 months). Set the threshold to match your organization's actual risk tolerance — 25% is a reasonable default, not a rule.

## Run it

```bash
node flag-concentration.mjs transactions.csv --concentration-threshold-pct=25
```

Requires only a stock Node.js install (18+), no dependencies.