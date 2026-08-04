# Content Performance Scorer

Ranks published content by an engagement/conversion score, so you know exactly what to repurpose or promote further instead of guessing from gut feel.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads `content.csv` (`title,url,views,shares,conversions`). Computes a weighted score (configurable weights) per piece, ranks all content, and outputs `content-ranked.csv` plus a `top-performers.md` shortlist.

## Adapt to your stack

Export views/shares/conversions from your analytics platform and CMS. Edit weights in `score.mjs` to reflect what your team actually values (e.g. conversions weighted far higher than raw views).

## Run it

```bash
node score.mjs content.csv
```

Requires only a stock Node.js install (18+), no dependencies.