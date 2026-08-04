# Email List Hygiene Bot

Flags invalid, bounced, or long-inactive subscribers so your sender reputation doesn't get dragged down by a list nobody's cleaned in years.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads `subscribers.csv` (`email,status,last_open_date,bounce_count`). Flags malformed emails, anyone with `bounce_count` at or above a threshold (default 3), and anyone with no open in `--inactive-days` (default 365). Outputs `list-hygiene-flags.csv`. **Never unsubscribes or deletes anyone** — flags only, for you to action in your ESP.

## Adapt to your stack

Export subscriber engagement/bounce data from your ESP (Mailchimp, HubSpot, etc.). Apply suppressions/unsubscribes back in your ESP directly after reviewing the flagged list.

## Run it

```bash
node check-list.mjs subscribers.csv --inactive-days=365 --bounce-threshold=3
```

Requires only a stock Node.js install (18+), no dependencies.