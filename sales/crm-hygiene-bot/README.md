# CRM Hygiene Bot

Flags stale, incomplete, or malformed CRM contact records on a schedule so your CRM stays trustworthy instead of silently rotting.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. Once you customize and run it, you own and operate it. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads a CRM contact export (CSV) and flags each record for one or more of:

- Missing email or phone
- Malformed email address (basic regex check)
- Duplicate email address across records
- Stale record — no activity in the last N days (default 180, configurable)

Outputs `flagged-contacts.csv` — the original columns plus a `flags` column listing every issue found, so you (or your team) can review and fix in your actual CRM. **This script never writes back to your CRM** — it's read-only against the export you give it.

## Adapt to your stack

Export contacts from your CRM (HubSpot, Salesforce, Pipedrive, etc.) as CSV with at minimum these columns: `id,name,email,phone,company,last_activity_date,owner`. Most CRMs let you customize export columns — rename to match, or edit the `REQUIRED_COLUMNS` list at the top of the script. To close the loop, either re-import the flagged CSV into your CRM as a list/view, or wire the output step to your CRM's API once you've reviewed how this script behaves on your real data.

## Run it

```bash
node hygiene-check.mjs contacts.csv
# optional: override the staleness window
node hygiene-check.mjs contacts.csv --stale-days=90
```

Requires only a stock Node.js install (18+) — no `npm install`, no dependencies.