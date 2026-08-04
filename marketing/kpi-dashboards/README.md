# KPI Dashboard (Marketing)

Rolls up a Google Analytics export and a CRM export into the marketing metrics that actually matter: CAC and MQL→SQL progression.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads `ga_export.csv` (`date,sessions,spend`) and `crm_export.csv` (`id,stage,created_date`, where `stage` includes values like `MQL`, `SQL`, `customer` — matching is case-insensitive). Computes total spend, new customers in the period, CAC (spend ÷ new customers), and an MQL→SQL+ progression rate (leads currently at SQL or customer ÷ leads currently at MQL). **This is a current-stage snapshot, not a true cohort conversion rate** — your CRM export shows where each lead is *right now*, not its full history, so this can't perfectly reconstruct "of the MQLs from three months ago, how many converted." For that, you'd need stage-history data (a timestamped stage-change log), not a point-in-time export.

## Adapt to your stack

Export from Google Analytics (or your analytics platform of choice) and your CRM's deal/contact stage history. Column names will differ per platform — rename to match, or edit `REQUIRED_COLUMNS` in the script. Feed `kpi-report.json` into your own BI tool or a recurring Slack/email digest if you want it delivered automatically rather than read as a file.

## Run it

```bash
node kpi-report.mjs ga_export.csv crm_export.csv
```

Requires only a stock Node.js install (18+), no dependencies.