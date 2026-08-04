# SEO Keyword Gap Tracker

Compares your keyword rankings export against a competitor's and surfaces keywords they rank for that you don't — real content opportunities, not guesses.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads `your-rankings.csv` and `competitor-rankings.csv` (both `keyword,position,search_volume`). Finds keywords the competitor ranks in the top `--top-n` (default 20) for, where you either don't rank or rank worse than `--worse-than` (default 50), sorted by search volume. Outputs `keyword-gaps.csv`.

## Adapt to your stack

Export ranking data from your SEO tool (Ahrefs, SEMrush, Search Console, etc.) for both your domain and a named competitor's domain.

## Run it

```bash
node find-gaps.mjs your-rankings.csv competitor-rankings.csv
```

Requires only a stock Node.js install (18+), no dependencies.