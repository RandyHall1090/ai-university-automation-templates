# Discount Approval Router

Flags deals whose discount percentage exceeds your configured approval threshold and routes them to the right approver — **flags and routes for review only, never auto-approves a discount.**

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads `deals.csv` (`id,name,rep,list_price,sale_price`) and `approval-rules.json` (discount-percentage tiers mapped to an approver). Computes each deal's discount %, matches it to the right tier, and outputs `approval-queue.csv` listing which deals need whose sign-off. No approval is ever granted automatically.

## Adapt to your stack

Set `approval-rules.json` tiers to match your actual pricing/discount policy. Export list price and sale price from your CRM's quote/deal record. Route the output to whatever approval mechanism you already use (email, Slack, a CRM approval workflow) — this script only identifies who needs to weigh in.

## Run it

```bash
node route.mjs deals.csv approval-rules.json
```

A sample `approval-rules.example.json` is included. Requires only a stock Node.js install (18+), no dependencies.