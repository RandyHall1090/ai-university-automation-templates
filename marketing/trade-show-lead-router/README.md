# Event/Trade Show Lead Router

Routes scanned trade-show leads to the right rep by territory or stated interest, so leads scanned on day one of a conference aren't sitting untouched a week later.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads `scanned-leads.csv` (`name,email,company,territory,interest_tag`) and `routing-rules.json` (territory→rep and interest_tag→rep maps, interest takes priority when both match). Outputs `routed-leads.csv` with an `assigned_rep` column, ready for import into your CRM.

## Adapt to your stack

Export scanned badge/lead data from your event's lead-retrieval tool. Set `routing-rules.json` to match your actual territory and product-interest ownership.

## Run it

```bash
node route-leads.mjs scanned-leads.csv routing-rules.json
```

A sample `routing-rules.example.json` is included. Requires only a stock Node.js install (18+), no dependencies.