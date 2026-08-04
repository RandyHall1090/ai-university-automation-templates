# Win/Loss Analyzer

Analyzes closed deals to surface loss-reason frequency and win patterns by segment, so you can see what's actually working instead of guessing.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads `closed-deals.csv` (`id,outcome,loss_reason,segment,amount,rep`). Tallies loss reasons by frequency, win rate by segment, and average deal size by outcome. Outputs `win-loss-report.md`.

## Adapt to your stack

Export closed-deal history from your CRM including a `loss_reason` field (most CRMs support a required dropdown on deal close — if yours doesn't capture this today, that's worth fixing before this template is useful).

## Run it

```bash
node analyze.mjs closed-deals.csv
```

Requires only a stock Node.js install (18+), no dependencies.