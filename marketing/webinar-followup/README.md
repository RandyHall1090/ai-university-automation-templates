# Webinar Follow-Up Automation

Segments webinar registrants into attended vs. no-show and generates the right next-step task list for each group, instead of sending everyone the same generic follow-up.

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads `registrants.csv` (`email,name,attended,watch_time_minutes`). Segments into attended-full (watched most of it), attended-partial, and no-show, and outputs `followup-tasks.csv` with a recommended next action per segment (e.g. "send recording + demo offer" for attended, "send recording + re-invite" for no-show).

## Adapt to your stack

Export attendance data from your webinar platform (Zoom, GoToWebinar, etc.). Edit the segment thresholds and recommended actions in `segment.mjs` to match your own follow-up playbook. Send the actual follow-ups through your ESP/CRM using this file as the task list.

## Run it

```bash
node segment.mjs registrants.csv --webinar-length-minutes=45
```

Requires only a stock Node.js install (18+), no dependencies.