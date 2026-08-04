# Territory Balancer

Rebalances lead/account assignments evenly across reps or territories, so one rep isn't drowning while another is idle.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads `accounts.csv` (`id,name,current_owner,territory`) and `reps.csv` (`rep_email,territory,capacity`). Redistributes unassigned or overloaded accounts evenly within each territory, respecting each rep's `capacity` cap. Outputs `rebalanced-assignments.csv` — a proposal, not an automatic CRM update.

## Adapt to your stack

Export current account ownership and rep capacity from your CRM. Review the proposed reassignments with sales leadership before applying them back to your CRM (bulk update tool or API).

## Run it

```bash
node rebalance.mjs accounts.csv reps.csv
```

Requires only a stock Node.js install (18+), no dependencies.