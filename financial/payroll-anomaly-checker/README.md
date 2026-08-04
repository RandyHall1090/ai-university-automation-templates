# Payroll Anomaly Checker

Compares a payroll run to the prior period and flags anomalies — new employees, missing employees, and unusual pay changes — for a human to verify before payroll is approved. **Never processes or submits payroll.**

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer. **Read-only by design — never writes, posts, initiates, or moves money.**

## What it does

Reads `current-payroll.csv` and `prior-payroll.csv` (both `employee_id,name,gross_pay`). Flags: employees in current but not prior (new), employees in prior but not current (removed), and any employee whose `gross_pay` changed by more than `--change-threshold-pct` (default 10%) between runs. Outputs `payroll-anomalies.md`.

## Adapt to your stack

Export payroll register data from your payroll platform (Gusto, ADP, etc.) for the current and prior pay period. Review flagged anomalies **before** approving the payroll run in your actual payroll system — this script never touches your payroll platform.

## Run it

```bash
node check-payroll.mjs current-payroll.csv prior-payroll.csv --change-threshold-pct=10
```

Requires only a stock Node.js install (18+), no dependencies.