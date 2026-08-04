# Landing Page Headline Variant Generator

Generates rule-based headline/subheadline variants from a core value proposition, for you to load into your A/B testing tool — a starting point for ideation, not a final-copy machine.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads `value-props.csv` (`page,value_prop,audience`). For each row, generates several headline patterns (benefit-led, question-led, number-led, urgency-led) via templates. Outputs `headline-variants.csv` for you to review, edit, and load into your test tool.

## Adapt to your stack

Edit the templates in `generate.mjs` to match your brand voice. For genuinely creative copy beyond template variation, swap in a call to your own AI provider (with your own API key) using these variants as a starting seed.

## Run it

```bash
node generate.mjs value-props.csv
```

Requires only a stock Node.js install (18+), no dependencies.