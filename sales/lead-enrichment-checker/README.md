# Lead Enrichment Checker

Flags leads missing key firmographic fields (industry, company size, revenue) and, if you supply an enrichment source file, fills them in from that source — otherwise just tells you what's missing so you know what to go enrich manually or via a paid enrichment tool.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads `leads.csv` (`id,company,domain,industry,company_size,revenue`) and an optional `enrichment-source.csv` (`domain,industry,company_size,revenue`, e.g. an export from an enrichment vendor you already pay for). Fills any missing field on a lead from a domain match in the enrichment source; whatever's still missing after that is flagged in `still-missing.csv`.

## Adapt to your stack

If you use a paid enrichment tool (Clearbit, ZoomInfo, etc.), export its data as `enrichment-source.csv` in the shape above. This template does not call any enrichment API directly — it merges data you already have.

## Run it

```bash
node enrich.mjs leads.csv enrichment-source.csv
```

Requires only a stock Node.js install (18+), no dependencies.