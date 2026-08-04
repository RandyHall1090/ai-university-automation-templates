# Meeting Intelligence Summarizer

Turns a plain-text call transcript into a structured summary — action items, mentioned dates, and a CRM-ready update snippet — so notes actually make it into your CRM instead of staying buried in a recording.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads a transcript (`.txt`, speaker-labeled lines like `Rep: ...` / `Prospect: ...`) and extracts, using plain heuristics (no external AI call — this is a rule-based starting point you can later swap for an LLM summarizer if you want):

- **Action items** — lines containing commitment phrases ("I will", "I'll", "we'll follow up", "next step", "send you", etc.), attributed only to the speaker matching `--speaker-label` (default `Rep`) so a prospect's "I'll think about it" isn't captured as your own commitment. If the transcript has no `Speaker:` labels at all, every line is scanned.
- **Mentioned dates** — any recognizable date-like text in the transcript. Dates without a year (e.g. "August 3") are extracted as-is — confirm the intended year yourself.
- A **sentiment placeholder** — always marked `human-review-needed`, since real sentiment judgment is left to you, not guessed by a heuristic

Outputs `meeting-summary.json` (structured) and `crm-update.md` (a ready-to-paste snippet for your CRM's notes field).

## Adapt to your stack

Export your call transcript from whatever tool records/transcribes it (Zoom, Gong, your own recorder + a transcription service). Match your transcript's actual speaker label with `--speaker-label` (e.g. `--speaker-label="Sales Rep"`). If you'd rather use a real LLM for higher-quality extraction, swap the heuristic matching in `summarize-transcript.mjs` for a call to your own AI provider — the input/output shape stays the same.

## Run it

```bash
node summarize-transcript.mjs call-transcript.txt --speaker-label=Rep
```

Requires only a stock Node.js install (18+), no dependencies.