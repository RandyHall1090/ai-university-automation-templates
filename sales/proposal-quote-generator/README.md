# Proposal & Quote Generator

Drafts a proposal document from a deal's CRM fields and human-entered line items. **Pricing and terms are always inputs you supply — never AI-generated or guessed.** The script only does arithmetic (quantity × price, sum) and document assembly.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. Once you customize and run it, you own and operate it. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads a `deal.json` file — customer info, your own line items (description, quantity, unit price — you type these in, the script never invents them), payment terms, and validity window. Renders a clean Markdown proposal (`proposal-<id>.md`) from `template.md`, with line-item math computed and totaled for you.

## Adapt to your stack

Edit `template.md` to match your own proposal format/branding. Pull `deal.json` fields from your CRM's deal record (export or API) — the script only needs the JSON shape shown in `deal.example.json`. To convert the Markdown output to a polished PDF/branded document, run it through your existing doc-conversion tool (e.g. Pandoc, or paste into your word processor) — that step is intentionally left to your own stack rather than baked in here.

## Run it

```bash
node generate-proposal.mjs deal.json
```

A sample `deal.example.json` is included — copy it to `deal.json`, fill in your real numbers, and run. Requires only a stock Node.js install (18+), no dependencies.