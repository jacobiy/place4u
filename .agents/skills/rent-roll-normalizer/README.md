# Rent Roll & T-12 Normalizer

Drop in a messy rent roll and T-12, get back a clean in-place operating snapshot with the seller's NOI and your normalized NOI bridged line by line and every red flag named.

Every deal arrives with a rent roll that lies a little and a T-12 that leaves things off. Model units counted as occupied. A management fee that vanishes because the owner runs it himself. A property tax line frozen at a basis that resets the day you close. This skill normalizes all of it, so the number you carry into your model is one you could run the building on. It runs in any assistant you already use. No code required.

## Use it

1. Copy the body of [`SKILL.md`](./SKILL.md) into your assistant (a Claude Project, a ChatGPT Custom GPT, or a fresh chat).
2. Give it your normalization rules: unit-status handling, vacancy and credit-loss floors, expense add-backs, tax reassessment math, and sanity bands. The skill ships with no default floors on purpose; those are yours to set.
3. Paste a rent roll and a T-12 and read the NOI bridge.

## What is intentionally left to you

The floors, add-backs, and reassessment ratios are not baked in. Those are your underwriting standards, so this open version leaves them as placeholders and asks you to supply them. If you want a version wired to your real standards, running on every deal automatically, that is what NextAutomation builds.

## Need this always-on?

If you want every rent roll and T-12 that hits your pipeline normalized automatically, flagged, and dropped into your deal file before you open it, start with an [Operations Audit](https://nextautomation.us/book-call?ref=na:skills:rent-roll-normalizer) or see the free templates at [nextautomation.us/resources/free-templates](https://nextautomation.us/resources/free-templates?ref=na:skills:rent-roll-normalizer).

Built by NextAutomation. MIT licensed. Example data is synthetic. Not investment advice.
