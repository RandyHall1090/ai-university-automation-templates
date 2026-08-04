# UTM Consistency Checker

Validates campaign URLs against your own UTM naming convention before a campaign launches, so your analytics don't fragment into a dozen near-duplicate campaign names.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads `urls.csv` (`url`) and `convention.json` (allowed values per UTM parameter, and required parameters). Parses each URL's query string, checks every required UTM parameter is present and each value matches the allowed set (or a naming pattern), and flags violations. Outputs `utm-violations.csv`.

## Adapt to your stack

Define `convention.json` from your team's actual UTM standard (source/medium/campaign naming rules). Run this before every campaign launch as a pre-flight check, not after the fact.

## Run it

```bash
node check-utms.mjs urls.csv convention.json
```

A sample `convention.example.json` is included. Requires only a stock Node.js install (18+), no dependencies.