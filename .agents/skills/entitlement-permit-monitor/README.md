# Entitlement & Permit Monitor

Watch a development portfolio's permits and catch the status changes that move a schedule. Give it your projects, the current permit states, and the prior snapshot, and get back a ranked queue of what changed, what it blocks downstream, and a drafted alert for each one worth acting on, awaiting your approval to send.

A permit slips into corrections the day it posts, and the cascade it sets off costs weeks if nobody notices for a month. This skill diffs the pipeline against your last check, flags the changes that touch the critical path, traces the downstream effect, and drafts the note, in whatever assistant you already use. No code required.

## Use it

1. Copy the body of [`SKILL.md`](./SKILL.md) into your assistant (a Claude Project, a ChatGPT Custom GPT, or a fresh chat).
2. Give it your portfolio and its critical-path map (which permit blocks which milestone), the current permit states, and the prior snapshot. The first run is the baseline; the diff starts on run two.
3. Read the ranked queue and the drafted alerts, then send the ones you approve, by hand.

## What is intentionally left to you

The critical-path map (which permits block which milestones) and your cost-of-delay rate are inputs, not defaults. The skill reports a dollar impact only from a carry rate you supply, and every alert it drafts is marked awaiting your approval: it never files a permit, touches an agency portal, or sends anything. If you want your permits watched always-on across every agency portal, on your schedule logic, that is what NextAutomation builds.

## Need this always-on?

If you want every permit across your portfolio watched daily, the cascade traced the moment one moves, and a ranked alert queue on your desk to approve, start with an [Operations Audit](https://nextautomation.us/book-call?ref=na:skills:entitlement-permit-monitor) or see the free templates at [nextautomation.us/resources/free-templates](https://nextautomation.us/resources/free-templates?ref=na:skills:entitlement-permit-monitor).

Built by NextAutomation. MIT licensed. Example data is synthetic. Not investment advice. It never files or sends; a person approves every alert.
