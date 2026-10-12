# AI Underwriting Copilot

A CRE acquisitions pipeline scaffold. Drop in your buy box and it runs the pipeline shape start to finish: screen, red-flag, underwrite, score, and route to a human. It runs in any assistant you already use. No code required for the core workflow.

This is a generic starter. It gives you the pipeline structure and the contract for each stage. It stops at the build-vs-buy wall: the real underwriting engine (assumption libraries, market comps, debt-sizing and exit logic, the calibrated scoring rubric) is the part worth owning, and this open version leaves it to you.

## The five stages

1. **Screen** every candidate against your buy box and surface the few worth a real look.
2. **Red-flag** each survivor against your buy-box rules and draft the re-trade counter.
3. **Underwrite** at the re-traded basis (this is where your real modeling logic goes).
4. **Score** the deal on your own rubric and write the one-page memo.
5. **Route** only the deals that clear your threshold to a human, who approves every call.

## Use it

1. Copy the body of [`SKILL.md`](./SKILL.md) into your assistant.
2. Give it your buy box: asset classes, markets, size band, return targets, thresholds, and comps.
3. Feed it deal flow and read the routed shortlist. A person approves before anything advances.

## What is intentionally left to you

The underwriting engine and the scoring weights are not baked in. Those are where a firm's edge lives, so this open version stops at the pipeline shape and asks you to plug in your own standards. A production build wires the real logic in and runs it always-on.

## Need this wired into your stack?

If you want your buy box, comps, and underwriting standards wired into a copilot that runs against live deal flow, start with an [Operations Audit](https://nextautomation.us/book-call?ref=na:skills:ai-underwriting-copilot) or see the free templates at [nextautomation.us/resources/free-templates](https://nextautomation.us/resources/free-templates?ref=na:skills:ai-underwriting-copilot).

Built by NextAutomation. MIT licensed. Example data is synthetic. Not investment advice.
