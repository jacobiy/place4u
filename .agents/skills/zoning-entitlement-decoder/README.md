# Zoning & Entitlement Decoder

Decode a zoning code into what you can actually build and how you get approved. Give it a parcel, a target use, and the zoning text, and get back the allowed-use call, the dimensional standards, the buildable envelope computed three ways with the binding constraint named, and the entitlement path with a realistic timeline and the risks flagged.

Zoning text is dense, and the number that decides a site is buried in it. This skill reads the code, sizes the envelope, and shows the approval path in one pass, in whatever assistant you already use, so you can see the yield and the risk before you commit. No code required.

## Use it

1. Copy the body of [`SKILL.md`](./SKILL.md) into your assistant (a Claude Project, a ChatGPT Custom GPT, or a fresh chat).
2. Give it the parcel, the target use, and your program defaults (efficiency factor, average unit size, parking assumptions) for where the code is silent. The skill invents no standard the code does not state.
3. Paste the zoning text and read the headline, the envelope, and the entitlement path.

## What is intentionally left to you

The program defaults it uses when the code is silent (your efficiency factor, unit sizes, and parking assumptions) are inputs, not guesses. Every code reading it returns is cited or marked `unknown`, and each one needs confirmation with the jurisdiction and counsel before it drives a decision. If you want zoning decoded automatically for every parcel you look at, on your program standards, that is what NextAutomation builds.

## Need this always-on?

If you want the buildable envelope and the entitlement path resolved on every incoming site, cited and dropped into your deal file, start with an [Operations Audit](https://nextautomation.us/book-call?ref=na:skills:zoning-entitlement-decoder) or see the free templates at [nextautomation.us/resources/free-templates](https://nextautomation.us/resources/free-templates?ref=na:skills:zoning-entitlement-decoder).

Built by NextAutomation. MIT licensed. Example data is synthetic. Not investment advice or legal advice; confirm every reading with the jurisdiction and counsel.
