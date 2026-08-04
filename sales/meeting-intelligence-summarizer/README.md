# Meeting Intelligence Summarizer

Turns a plain-text call transcript into a structured summary — action items, mentioned dates, and a CRM-ready update snippet — so notes actually make it into your CRM instead of staying buried in a recording.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. Once you customize and run it, you own and operate it. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads a transcript (`.txt`, speaker-labeled lines like `Rep: ...` / `Prospect: ...`) and extracts, using plain heuristics (no external AI call — this is a rule-based starting point you can later swap for an LLM summarizer if you want):

- **Action items** — lines containing commitment phrases ("I will", "I'll", "we'll follow up", "next step", "send you", etc.)
- **Mentioned dates** — any recognizable date-like text in the transcript
- A **sentiment placeholder** — always marked `human-review-needed`, since real sentiment judgment is left to you, not guessed by a heuristic

Outputs `meeting-summary.json` (structured) and `crm-update.md` (a ready-to-paste snippet for your CRM's notes field).

## Adapt to your stack

Export your call transcript from whatever tool records/transcribes it (Zoom, Gong, your own recorder + a transcription service). If you'd rather use a real LLM for higher-quality extraction, swap the heuristic matching in `summarize-transcript.mjs` for a call to your own AI provider — the input/output shape stays the same.

## Run it

```bash
node summarize-transcript.mjs call-transcript.txt
```

Requires only a stock Node.js install (18+), no dependencies.