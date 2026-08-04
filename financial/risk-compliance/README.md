# Risk & Compliance Flagging

Flags transactions that cross your own configured risk thresholds (the "Bright Line") for human review. **Flags only — never blocks, initiates, or moves a transaction.**

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. Once you customize and run it, you own and operate it. See the [repo README](../../README.md) for the full disclaimer. **This template is read-only by design — it never writes, posts, initiates, or moves money, and never will.**

## What it does

Reads `transactions.csv` (`date,description,amount,vendor,is_new_vendor`) and `bright-line.json` — your own configured thresholds. Flags: transactions over a configured dollar amount, round-dollar amounts over a threshold (a common structuring/error signal), weekend-dated transactions, and first payments to a new vendor over a configured amount. Outputs `flagged-transactions.csv` with a `flag_reasons` column. Nothing here blocks a payment or initiates any action — it is a review aid only.

## Adapt to your stack

Set `bright-line.json` thresholds to match your own risk tolerance and existing internal controls policy — the defaults are a reasonable starting point, not a compliance determination. Export transactions from your accounting/banking platform on whatever cadence your internal controls require (daily, weekly). Route flagged rows to whoever actually reviews exceptions at your organization.

## Run it

```bash
node flag-risk.mjs transactions.csv bright-line.json
```

A sample `bright-line.example.json` is included. Requires only a stock Node.js install (18+), no dependencies.