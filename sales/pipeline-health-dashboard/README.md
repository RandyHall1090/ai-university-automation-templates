# Pipeline Health Dashboard

Rolls up a CRM deal export into a real pipeline health report: stage counts and value, average deal age per stage, stalled deals, and win rate (when closed-deal history is present).

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. Once you customize and run it, you own and operate it. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads a deals export (CSV) with columns `id,name,stage,amount,owner,created_date,stage_updated_date,closed_date,outcome` (`outcome` is `won`/`lost`/blank for open deals). Produces:

- `pipeline-report.md` — a readable rollup: deal count and total value per stage, average days-in-stage, deals flagged as stalled (no stage movement in 30+ days, configurable), and win rate from closed deals.
- `pipeline-report.json` — the same numbers in machine-readable form, for feeding into your own BI tool or a further script.

## Adapt to your stack

Export your deals view from your CRM with the columns above (most CRMs let you customize export fields — rename to match, or edit `REQUIRED_COLUMNS` in the script). Run this on a schedule (cron, Task Scheduler, or your CRM's own automation) and pipe `pipeline-report.json` into a real dashboard (Google Sheets, a BI tool, or your own internal tool) if you want it visualized rather than read as Markdown.

## Run it

```bash
node pipeline-report.mjs deals.csv
# optional: override the stalled-deal threshold
node pipeline-report.mjs deals.csv --stalled-days=45
```

Requires only a stock Node.js install (18+), no dependencies.