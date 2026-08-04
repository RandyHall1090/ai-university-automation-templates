# Reporting Automation

Assembles a monthly/board report from figures you've already verified — it never invents or estimates a number, only formats and structures ones you provide.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. Once you customize and run it, you own and operate it. See the [repo README](../../README.md) for the full disclaimer. **This template is read-only by design — it never writes, posts, initiates, or moves money, and never will.**

## What it does

Reads `verified-numbers.json` — a file of figures you (or your finance lead) have already reviewed and approved — and renders it into `board-report.md` using `template.md`. There is no calculation of new figures here beyond simple presentation formatting (currency/percent display); every number in the output traces directly back to a number you put in the input file.

## Adapt to your stack

Populate `verified-numbers.json` from your own monthly close process — pull the approved figures from your accounting platform's month-end reports once your finance lead has signed off on them. Edit `template.md` to match your own board-report format and sections.

## Run it

```bash
node build-report.mjs verified-numbers.json
```

A sample `verified-numbers.example.json` is included. Requires only a stock Node.js install (18+), no dependencies.