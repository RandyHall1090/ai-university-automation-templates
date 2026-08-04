# Cold Outreach List Deduplicator

Merges multiple prospect-list exports and removes duplicates by email/domain before you launch a campaign — so the same person doesn't get hit three times because they were on three different lists.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads any number of CSV files (each with at least an `email` column) passed as arguments, merges them, dedupes by lowercased email (keeping the first occurrence), and flags rows sharing the same domain for a quick eyeball on account overlap. Outputs `deduped-list.csv` and `domain-overlap.csv`.

## Adapt to your stack

Export your prospect lists from whatever source you're pulling from (a list-building tool, a CRM view, a conference scan). Feed `deduped-list.csv` into your actual outreach tool.

## Run it

```bash
node dedupe.mjs list1.csv list2.csv list3.csv
```

Requires only a stock Node.js install (18+), no dependencies.