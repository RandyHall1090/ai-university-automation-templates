# KPI Dashboard Builder (Financial)

Rolls raw financial exports up into the numbers a founder/CFO actually checks weekly: cash runway, burn rate, AR aging, and budget vs. actual.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. Once you customize and run it, you own and operate it. See the [repo README](../../README.md) for the full disclaimer. **This template is read-only by design — it never writes, posts, initiates, or moves money, and never will.**

## What it does

Reads `financials.csv` (`month,cash_balance,expenses,budget`) and `receivables.csv` (`invoice_id,amount,due_date,paid`). Computes: current cash balance, average monthly burn (expenses over the trailing 3 months), runway in months (cash ÷ burn), AR aging buckets (current / 30 / 60 / 90+ days past due, unpaid invoices only), and budget vs. actual variance per month. Outputs `financial-kpi-report.md` and `.json`.

## Adapt to your stack

Export monthly financials and your AR aging detail from your accounting platform (QuickBooks, Xero, NetSuite). Column names vary by platform — rename to match or edit `REQUIRED_COLUMNS`. Run this monthly (or weekly for AR) and feed the JSON into your own board-report deck or BI tool.

## Run it

```bash
node financial-kpi.mjs financials.csv receivables.csv
```

Requires only a stock Node.js install (18+), no dependencies.