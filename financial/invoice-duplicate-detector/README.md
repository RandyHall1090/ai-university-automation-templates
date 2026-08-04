# Invoice Duplicate Detector

Flags potential duplicate invoices/payments in your AP data before they get paid twice — one of the most common and most preventable real-money losses in AP.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer. **Read-only by design — never writes, posts, initiates, or moves money.**

## What it does

Reads `invoices.csv` (`invoice_id,vendor,amount,invoice_date,invoice_number`). Flags exact duplicates (same vendor + amount + invoice_number) and near-duplicates (same vendor + same amount within `--date-window-days`, default 14, but a different invoice number — a common sign of a resubmitted or renumbered duplicate). Outputs `duplicate-invoice-flags.csv`.

## Adapt to your stack

Export your AP invoice register from your accounting platform. Review every flagged pair manually before either invoice is paid — this script identifies candidates, it does not determine which one (if either) is legitimate.

## Run it

```bash
node find-duplicates.mjs invoices.csv --date-window-days=14
```

Requires only a stock Node.js install (18+), no dependencies.