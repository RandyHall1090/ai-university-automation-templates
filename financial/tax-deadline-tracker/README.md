# Tax Deadline Tracker

Tracks upcoming filing deadlines from a list you maintain and flags anything approaching, so nothing gets missed because it fell off someone's calendar.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer. **Read-only by design — never writes, posts, initiates, or moves money, and it does not file anything.**

## What it does

Reads `deadlines.csv` (`filing_name,jurisdiction,due_date,owner,status`). Flags any deadline with `status` not `filed` and due within `--window-days` (default 30). Outputs `upcoming-deadlines.md`, most urgent first.

## Adapt to your stack

Build `deadlines.csv` from your actual tax calendar (sales tax, payroll tax, franchise tax, annual report filings — whatever applies to your entity and jurisdictions). This is a reminder tool, not a substitute for your tax advisor or a filing system — always verify deadlines with a qualified professional.

## Run it

```bash
node track-deadlines.mjs deadlines.csv --window-days=30
```

Requires only a stock Node.js install (18+), no dependencies.