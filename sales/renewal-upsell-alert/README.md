# Renewal & Upsell Alert

Flags contracts approaching renewal within a configurable window, and accounts whose usage data suggests they're ready for an upsell conversation.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads `contracts.csv` (`account_id,account_name,renewal_date,seats_purchased,seats_used,owner`). Flags any contract renewing within `--window-days` (default 90), and separately flags accounts using 90%+ of purchased seats as upsell candidates. Outputs `renewal-upsell-alerts.csv`.

## Adapt to your stack

Export contract/renewal dates from your CRM or billing system, and seat usage from your product's own usage data (if you track it). Route the output to whoever owns renewals — account managers or CS — as a weekly digest.

## Run it

```bash
node alert.mjs contracts.csv --window-days=90
```

Requires only a stock Node.js install (18+), no dependencies.