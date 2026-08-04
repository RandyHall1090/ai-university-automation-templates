# Expense Policy Compliance Checker

Flags expense report line items that violate your configured policy (amount limits, missing receipts, disallowed categories) for human review — **it never approves, rejects, or reimburses an expense itself.**

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer. **Read-only by design — never writes, posts, initiates, or moves money.**

## What it does

Reads `expenses.csv` (`employee,category,amount,has_receipt,date`) and `policy.json` (per-category amount limits, receipt-required threshold, disallowed categories). Flags any line item that: exceeds its category limit, lacks a receipt above the receipt-required threshold, or falls in a disallowed category. Outputs `policy-violations.csv`.

## Adapt to your stack

Set `policy.json` to match your actual expense policy. Export expense report line items from your expense platform (Expensify, Ramp, Brex, etc.). Route flagged items to whoever actually approves expenses — this script identifies exceptions, it doesn't decide them.

## Run it

```bash
node check-expenses.mjs expenses.csv policy.json
```

A sample `policy.example.json` is included. Requires only a stock Node.js install (18+), no dependencies.