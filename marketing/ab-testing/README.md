# A/B Test Runner

Stands up a simple statistical test on two (or more) variants' results and tells you whether the winner is statistically real or just noise.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. Once you customize and run it, you own and operate it. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads `results.csv` (`variant,visitors,conversions`). Computes each variant's conversion rate, runs a two-proportion z-test between the top two variants by conversion rate, and reports whether the difference is statistically significant at the 95% confidence level (|z| ≥ 1.96). **It will not declare a winner on too little data** — it tells you plainly when the result isn't significant yet rather than forcing a call.

## Adapt to your stack

Export visitor/conversion counts from your testing tool (Google Optimize successor, VWO, Optimizely, or your own event tracking) into the CSV shape above. Run this after each check-in on a live test, or once at the end — either way, don't stop a test just because early results look good; let it reach a meaningful sample size first.

## Run it

```bash
node ab-test.mjs results.csv
```

Requires only a stock Node.js install (18+), no dependencies.