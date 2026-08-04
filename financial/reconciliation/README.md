# Reconciliation Assistant

Matches bank feed transactions against your ledger and flags mismatches on both sides. **Never posts an adjustment — flags only, for a human to reconcile.**

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. Once you customize and run it, you own and operate it. See the [repo README](../../README.md) for the full disclaimer. **This template is read-only by design — it never writes, posts, initiates, or moves money, and never will.**

## What it does

Reads `bank.csv` and `ledger.csv` (both `date,description,amount,reference` — `reference` optional). Matches entries by amount (exact) and date (within a configurable tolerance window, default 3 days), preferring a `reference` match when present. Outputs `reconciliation-report.md` listing matched pairs, and — more importantly — every bank entry with no ledger match and every ledger entry with no bank match, so you know exactly what needs manual attention.

## Adapt to your stack

Export your bank feed from your bank/accounting platform and your ledger from your accounting system (QuickBooks, Xero, NetSuite, etc.). If your systems use a shared reference/check number, populate the `reference` column for far more reliable matching than date+amount alone.

## Run it

```bash
node reconcile.mjs bank.csv ledger.csv
# optional: widen the date-matching tolerance
node reconcile.mjs bank.csv ledger.csv --tolerance-days=5
```

Requires only a stock Node.js install (18+), no dependencies.