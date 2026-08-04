# Lead Scoring & Routing

Scores CRM leads by engagement/intent signals using weights you control, and routes each lead to a rep via round-robin or territory rules.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. Once you customize and run it, you own and operate it. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads `leads.csv` (`id,name,email,email_opens,page_views,demo_requested,company_size,territory`) and a `weights.json` config. Computes a weighted score per lead, then routes: if `routing.mode` is `round_robin`, assigns reps from `routing.reps` in rotating order; if `territory`, matches each lead's `territory` field to a rep in `routing.territory_map`. Outputs `scored-leads.csv` with `score` and `assigned_rep` columns.

## Adapt to your stack

Export engagement fields from your CRM/marketing automation platform (or your website analytics, joined by email). Edit `weights.json` to reflect what actually predicts a good lead for your business — the defaults are a reasonable starting point, not a formula to trust blindly. Feed `scored-leads.csv` back into your CRM (import, or call its API) to actually assign leads.

## Run it

```bash
node score-and-route.mjs leads.csv weights.json
```

A sample `weights.example.json` is included. Requires only a stock Node.js install (18+), no dependencies.