# Expense Categorization

Categorizes raw transaction exports using rules you control, flags anything it can't confidently categorize for human review, and **never writes anything back to your source system.**

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. Once you customize and run it, you own and operate it. See the [repo README](../../README.md) for the full disclaimer. **This template is read-only by design — it never writes, posts, initiates, or moves money, and never will.**

## What it does

Reads `transactions.csv` (`date,description,amount`) and `rules.json` (keyword → category mappings you define). Matches each transaction's description against your rules (case-insensitive substring match) and assigns a category. Anything matching no rule is marked `uncategorized` for human review — the script never guesses a category it isn't confident about. Outputs `categorized-transactions.csv`.

## Adapt to your stack

Export transactions from your bank feed or accounting platform (QuickBooks, Xero, etc.) as CSV. Build `rules.json` from your actual chart of accounts and real vendor names — start narrow and expand it as you see `uncategorized` rows in the output. Import the categorized output back into your accounting platform manually, or through its import tool, after you've reviewed it — this script does not connect to your accounting system directly.

## Run it

```bash
node categorize.mjs transactions.csv rules.json
```

A sample `rules.example.json` is included. Requires only a stock Node.js install (18+), no dependencies.