# Subscription/SaaS Spend Auditor

Flags likely duplicate or overlapping software subscriptions from your expense data — the "why are we paying for three project management tools" report.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer. **Read-only by design — never writes, posts, initiates, or moves money.**

## What it does

Reads `subscriptions.csv` (`vendor,category,monthly_cost,department`). Groups by `category` and flags any category with more than one active vendor as a possible overlap, listing all vendors and total combined spend in that category. Outputs `saas-overlap-report.md`.

## Adapt to your stack

Build `subscriptions.csv` from your expense/AP data filtered to recurring software charges, categorized by what each tool actually does (project management, communication, analytics, etc.) — you'll need to assign categories once; after that this report runs on every new export.

## Run it

```bash
node audit-saas.mjs subscriptions.csv
```

Requires only a stock Node.js install (18+), no dependencies.