# KPI Dashboard (Marketing)

Rolls up a Google Analytics export and a CRM export into the marketing metrics that actually matter: CAC, MQL→SQL conversion rate, and spend efficiency.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. Once you customize and run it, you own and operate it. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads `ga_export.csv` (`date,sessions,spend`) and `crm_export.csv` (`id,stage,created_date`, where `stage` includes values like `MQL`, `SQL`, `customer`). Computes total spend, new customers in the period, CAC (spend ÷ new customers), and MQL→SQL conversion rate. Outputs `kpi-report.md` and `kpi-report.json`.

## Adapt to your stack

Export from Google Analytics (or your analytics platform of choice) and your CRM's deal/contact stage history. Column names will differ per platform — rename to match, or edit `REQUIRED_COLUMNS` in the script. Feed `kpi-report.json` into your own BI tool or a recurring Slack/email digest if you want it delivered automatically rather than read as a file.

## Run it

```bash
node kpi-report.mjs ga_export.csv crm_export.csv
```

Requires only a stock Node.js install (18+), no dependencies.