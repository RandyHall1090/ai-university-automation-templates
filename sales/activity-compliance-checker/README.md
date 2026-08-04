# Sales Activity Compliance Checker

Flags open deals with no logged activity (call, email, meeting) in longer than your team's expected cadence — a different concern than CRM Hygiene Bot, which checks data quality, not activity cadence.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads `deals.csv` (`id,name,stage,owner,last_activity_date,amount,outcome`). `outcome` follows the same convention as Pipeline Health Dashboard — blank means open, `won`/`lost` means closed. Only open deals are evaluated; closed deals never get new activity and would otherwise dominate the flagged list. Flags any open deal with no activity in the last `--max-gap-days` (default 14). Outputs `activity-gaps.csv`, sorted by longest gap first.

## Adapt to your stack

Export `last_activity_date` from your CRM's activity timeline (most CRMs roll this up automatically per deal), and an `outcome` field so closed deals can be excluded. Set `--max-gap-days` to match your actual sales process cadence expectations.

## Run it

```bash
node check-activity.mjs deals.csv --max-gap-days=14
```

Requires only a stock Node.js install (18+), no dependencies.