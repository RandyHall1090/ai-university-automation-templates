# Content & Social Automation

Generates a content calendar across weeks/channels from your topic list, plus rule-based caption variants (short/long/CTA-led) for each post — no LLM call, pure template variation you can swap for a real AI call later.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. Once you customize and run it, you own and operate it. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads `topics.csv` (`topic,channel`) and generates a calendar spreading topics evenly across a configurable number of weeks and posting days, avoiding immediate repeats of the same topic. For each scheduled post, generates three caption variants (short, long, CTA-led) using simple template substitution. Outputs `content-calendar.csv`.

## Adapt to your stack

Schedule the actual posts through your social tool's native scheduler (Buffer, Hootsuite, native platform schedulers) using the calendar as your source list, or connect this script's output to that tool's API once reviewed. To generate genuinely creative captions instead of template variants, swap the `generateVariants` function for a call to your own AI provider (OpenAI, Anthropic, etc.) with your own API key — the script's structure stays the same.

## Run it

```bash
node build-calendar.mjs topics.csv --weeks=4 --posts-per-week=3
```

Requires only a stock Node.js install (18+), no dependencies.