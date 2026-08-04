# AI University — Automation Template Library

Vetted, ready-to-deploy automation starter templates for AI University's
corporate automation tracks: **Sales Automation**, **Marketing Automation**,
and **Financial Automation**. Each template pairs with a lesson in the
matching course — clone the folder, adapt it to your own stack using
Claude Code, and deploy it in your own environment.

## Disclaimer — read before using any template here

> **This is a starting point, not a supported product.** Every template in
> this repo is provided as-is for you to review, adapt, and deploy in your
> own environment, using your own credentials and your own judgment. Once
> you customize and run it, **you own and operate it** — Securafy does not
> monitor, maintain, or provide support for your deployed instance. Read
> every line before you run it. Test in a non-production environment first.
> This is training material, not a warranted commercial product — no
> guarantee is made about fitness for any particular purpose, and you are
> responsible for verifying it's safe and correct for your own systems
> before relying on it.

## Structure

```
sales/<template-slug>/        — 5 templates, maps to the Sales Automation course
marketing/<template-slug>/    — 5 templates, maps to the Marketing Automation course
financial/<template-slug>/    — 5 templates, maps to the Financial Automation course (all read-only)
```

Each template folder is **self-contained** — a single script plus its own
README. There's no shared library to import: clone or copy one folder on
its own and it works standalone, deliberately, since most learners will
adopt one template at a time rather than the whole repo.

## Design principles

- **Tool-agnostic.** Every template reads from plain CSV/JSON exports and
  writes plain CSV/JSON/Markdown output — no vendor SDK, no hardcoded CRM,
  ESP, or accounting platform. You adapt the read/write layer to your own
  stack (export from your CRM, import the output back, or wire the script
  to your platform's API once you've reviewed it).
- **Zero dependencies.** Every script runs with a stock Node.js install
  (`node <script>.mjs <input-file>`) — no `npm install` step, so there's
  nothing to audit in a supply chain sense beyond the script itself.
- **Financial Automation templates are read-only by design.** They flag,
  categorize, and report — none of them write, post, initiate, or move
  money, ever.
- **Human-verified inputs stay human-verified.** Where a template touches
  pricing, proposal terms, or financial figures, those values are always
  read from your own input file, never generated or guessed by the script.

## Tracks

| Track | Templates |
|---|---|
| [Sales](sales/) | CRM Hygiene Bot · Outreach & Follow-Up Automation · Proposal & Quote Generator · Pipeline Health Dashboard · Meeting Intelligence Summarizer |
| [Marketing](marketing/) | Campaign Automation · Lead Scoring & Routing · Content & Social Automation · KPI Dashboard · A/B Test Runner |
| [Financial](financial/) | Expense Categorization · Reconciliation Assistant · KPI Dashboard Builder · Reporting Automation · Risk & Compliance Flagging |

Built by [Securafy](https://securafy.com) for [AI University](https://learn.securafyai.com).
