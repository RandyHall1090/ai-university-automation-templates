# Cash Flow Forecaster

Projects near-term cash position from historical inflow/outflow trends — a planning aid, not a guarantee, and it says so in its own output.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer. **Read-only by design — never writes, posts, initiates, or moves money.**

## What it does

Reads `cash-history.csv` (`month,inflow,outflow,ending_balance`). Computes the trailing-3-month average net cash flow (inflow − outflow) and projects the ending balance forward `--months-ahead` (default 3) months using that average, clearly labeled as a straight-line projection, not a prediction of future results.

## Adapt to your stack

Export monthly cash flow history from your accounting platform. Use this as a starting-point planning tool alongside your own judgment about upcoming known changes (new hires, big contracts, seasonal effects) that a simple trailing average can't see.

## Run it

```bash
node forecast.mjs cash-history.csv --months-ahead=3
```

Requires only a stock Node.js install (18+), no dependencies.