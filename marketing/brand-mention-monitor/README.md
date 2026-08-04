# Brand Mention Monitor

Categorizes brand mentions pulled from a social-listening tool export by urgency, so someone reviews the angry tweet before the neutral one.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads `mentions.csv` (`platform,author,text,url,date`). Applies rule-based keyword scanning (negative-sentiment words, urgency words like "refund"/"cancel"/"lawsuit") to flag each mention as `urgent_review`, `neutral`, or `positive`. Outputs `mentions-triaged.csv`, urgent items first. This is a rough triage heuristic, not real sentiment analysis — a human still reads every mention.

## Adapt to your stack

Export mentions from whatever social listening tool you use (Brand24, Mention, Hootsuite Insights, or a manual export). Edit the keyword lists in `triage.mjs` to reflect language actually relevant to your brand and industry.

## Run it

```bash
node triage.mjs mentions.csv
```

Requires only a stock Node.js install (18+), no dependencies.