# Draft response-to-reviewers table

Part A rows filled. Part B and Part C rows left blank, per instruction —
Part B has not been started; Part C is a decisions-needed memo, not
actions taken.

| Comment ID | Reviewer's point | Action taken | Location in revised manuscript |
|---|---|---|---|
| R1-1 / R1-9 | Binning sentence contradicts its own vector; window 6 mislabelled as 5 min | Corrected sentence; interpretive gloss removed | Method validation, main-road discrepancy paragraph |
| R1-2 | Reconstructed timing distribution not uniquely determined | Replaced with aggregate-only statement listing all three admissible triples | Method validation, main-road timing paragraph |
| R1-6 | Timing-error column conflates app latency with unmeasured device clock offset | Column renamed "Timing offset"; caption states the conflation explicitly | Table 8 header and caption |
| R1-10 / R1-11 | Table 8 caption contains revision history; identical-looking percentages read as a typo without fractions | Revision-history sentence removed; fractions added to every percentage in Tables 8 and 9 | Table 8, Table 9, caption |
| R1-12 | Discrepancy-pair sensitivity not stated numerically | One sentence inserted with both alternative-reading figures | Method validation, discrepancy paragraph |
| R1-7 / R1-8 | Abstract overstates: "up to 97.5%" anchors on best case; recall/accuracy floors omit wide CIs for small-sample modules | Both phrases replaced per supplied wording | Abstract |
| R1-4 | Ground-truth rater is also the developer; not stated as rater bias | Limitations paragraph replaced per supplied wording | Limitations |
| R2-5 | Load-test concurrency figure is a deployment property, not a software property, but Table 2 doesn't say so | Sentence appended to Table 2's Concurrent multi-surveyor use row | Table 2 |
| R2-6 | 5MB storage budget stated as "conservative" without the UTF-16 code-unit caveat's real consequence shown in the body | Investigated; found no factor-of-two spread is actually supported by the underlying derivation (data is all-ASCII, byte count = code-unit count); pulled the reasoning into the manuscript body instead of stating an unsupported range | Storage ceiling paragraph, Method details |
| R1-13 | `z = 1.959964` is unnecessary notation for a general reader | Replaced with "Wilson score interval, 95%" verbatim as instructed (creates a minor repetition with the adjacent "Wilson 95% CI" — flagged in changelog, not smoothed) | Method validation, first Wilson CI mention |
| R2-8 | Table 3 restates the paragraph above it and overlaps Table 4 | Merge/cut proposed, not applied — awaiting confirmation | `SUBMISSION_NOTES.md` §9 |
| R1-16 | Figure 2's single-row layout unreadable at print column width | Rebuilt as 2x3 grid at native 3x-capture resolution | Figure 2 |
| R2-11 | "Related research article: None" vs. Background's mention of a corridor-level analysis | Cover-letter sentence drafted, field itself not changed | `SUBMISSION_NOTES.md` §8 |
| B1 | Admin ID weakness misattributed to platform | *(Part B — not started)* | |
| B2 | Uncaught QuotaExceededError | *(Part B — not started)* | |
| B3 | Representative-scenario load-test arithmetic (179 vs ~250 requests) | *(Part B — not started)* | |
| B4 | Result-to-code-version mapping | *(Part B — not started)* | |
| B5 | Dead gesture handler, data minimisation, site-detail check | *(Part B — not started)* | |
| C1 | Main-road irreproducibility, video deleted | *(Part C — memo only, decision is yours)* | |
| C2 | Five-module construction direction | *(Part C — memo only, decision is yours)* | |
| C3 | Inter-rater reliability, consent, setup-time questions, Figure 3 schematic | *(Part C — memo only, decision is yours)* | |
