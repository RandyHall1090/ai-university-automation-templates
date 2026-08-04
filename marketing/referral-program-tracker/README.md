# Referral Program Tracker

Tracks referral codes and resulting signups, and computes rewards owed per referrer — **calculates only, never issues a payment or credit automatically.**

> **This is a starting point, not a supported product.** Read every line before you run it, adapt it to your own stack, and test in a non-production environment first. See the [repo README](../../README.md) for the full disclaimer.

## What it does

Reads `referrals.csv` (`referrer_email,referral_code,referred_email,signup_date,converted`) and `reward-rules.json` (reward amount per converted referral, optional cap). Tallies converted referrals per referrer (email matching is case-insensitive) and de-duplicates by `referred_email` per referrer, so the same referred contact appearing twice in an export doesn't get counted — and paid — twice. Computes reward owed, capped at `max_reward_per_referrer` if set. Outputs `rewards-owed.csv` for your finance/ops team to actually issue.

## Adapt to your stack

Export referral tracking data from your referral tool or your own signup-flow tracking (a `referral_code` field captured at signup). Set reward amount/cap in `reward-rules.json` to match your actual program terms.

## Run it

```bash
node calculate-rewards.mjs referrals.csv reward-rules.json
```

A sample `reward-rules.example.json` is included. Requires only a stock Node.js install (18+), no dependencies.