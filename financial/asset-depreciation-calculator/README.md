# Fixed Asset Depreciation Calculator

Computes a straight-line depreciation schedule for your fixed assets and flags assets nearing end-of-life — reporting only, it never posts a depreciation entry to your books.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer. **Read-only by design — never writes, posts, initiates, or moves money.**

## What it does

Reads `assets.csv` (`asset_id,name,purchase_date,cost,useful_life_years,salvage_value`). Computes straight-line annual depreciation, current book value based on elapsed time, and flags assets with less than `--eol-warning-months` (default 6) of useful life remaining. Outputs `depreciation-schedule.csv`.

## Adapt to your stack

Export your fixed asset register from your accounting platform. If you use an accelerated depreciation method (double-declining, MACRS) rather than straight-line, adjust the calculation in `depreciate.mjs` — or consult your accountant on which method applies to your books vs. your tax return, since they often differ.

## Run it

```bash
node depreciate.mjs assets.csv --eol-warning-months=6
```

Requires only a stock Node.js install (18+), no dependencies.