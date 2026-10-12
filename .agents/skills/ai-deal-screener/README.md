# AI Deal Screener

First-pass triage for real estate deal flow. Paste a pile of broker emails or OMs, get a ranked shortlist with a KILL / WATCH / PURSUE / PRIORITY verdict on each, so you spend your underwriting time on the deals that actually fit your box.

You review more deals than you can underwrite. This skill turns your buy-box into a scoring pass, triages the whole pile in one paste, and hands you the few worth a real look. It runs in any assistant you already use. No code required.

## Use it

1. Copy the body of [`SKILL.md`](./SKILL.md) into your assistant (a Claude Project, a ChatGPT Custom GPT, or a fresh chat).
2. Give it your buy-box: the dimensions you score on, a weight for each, your verdict thresholds, and your deal-breakers. The skill ships with no default weights on purpose; those are yours to set.
3. Paste your deals and read the ranked table.

## What is intentionally left to you

The scoring weights, verdict cutoffs, and deal-breaker rules are not baked in. That logic is where a firm's edge lives, so this open version leaves it as placeholders and asks you to supply it. If you want a version wired to your real standards, with the model running always-on against live deal flow, that is what NextAutomation builds.

## Need this always-on?

If you want your inbound flow triaged automatically, scored against your box, and dropped into your CRM without you touching it, start with an [Operations Audit](https://nextautomation.us/book-call?ref=na:skills:ai-deal-screener) or see the free templates at [nextautomation.us/resources/free-templates](https://nextautomation.us/resources/free-templates?ref=na:skills:ai-deal-screener).

Built by NextAutomation. MIT licensed. Example data is synthetic. Not investment advice.
