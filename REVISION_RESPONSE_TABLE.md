# Draft response-to-reviewers table

Part A, Part 0, A2, and Part B rows filled. Part C rows left blank, per
instruction — it is a decisions-needed memo
(`REVISION_DECISIONS_NEEDED.md`), not actions taken.

| Comment ID | Reviewer's point | Action taken | Location in revised manuscript |
|---|---|---|---|
| Part 0 | Live Admin ID (`ADM-5505`) published, unredacted, in Figure 2 | Confirmed live via read-only registry check; screenshot regenerated with a placeholder ID that cannot collide with a real one; `ADM-5505` rotated by the author on the live backend | Figure 2 (T-Junction panel) |
| R1-1 / R1-9 | Binning sentence contradicts its own vector; window 6 mislabelled as 5 min | Corrected sentence; interpretive gloss removed | Method validation, main-road discrepancy paragraph |
| R1-2 | Reconstructed timing distribution not uniquely determined | Replaced with aggregate-only statement listing all three admissible triples | Method validation, main-road timing paragraph |
| R1-6 | Timing-error column conflates app latency with unmeasured device clock offset | Column renamed "Timing offset"; caption states the conflation explicitly | Table 8 header and caption |
| R1-10 / R1-11 | Table 8 caption contains revision history; identical-looking percentages read as a typo without fractions | Revision-history sentence removed; fractions added to every percentage in Tables 8 and 9 | Table 8, Table 9, caption |
| R1-12 | Discrepancy-pair sensitivity not stated numerically | One sentence inserted with both alternative-reading figures | Method validation, discrepancy paragraph |
| R1-7 / R1-8 | Abstract overstates: "up to 97.5%" anchors on best case; recall/accuracy floors omit wide CIs for small-sample modules | Both phrases replaced per supplied wording | Abstract |
| R1-4 | Ground-truth rater is also the developer; not stated as rater bias | Limitations paragraph replaced per supplied wording | Limitations |
| R2-5 | Load-test concurrency figure is a deployment property, not a software property, but Table 2 doesn't say so | Sentence appended to Table 2's Concurrent multi-surveyor use row (round 1); moved to a table footnote after it broke Table 2's page layout (round 2, A2-1) | Table 2 footnote a |
| R2-6 | 5MB storage budget stated as "conservative" without the UTF-16 code-unit caveat's real consequence shown in the body | Round 1: pulled the ASCII-coincidence reasoning into the body. Round 2 (A2-6): the real ambiguity was code units vs. bytes, not UTF-8 vs. UTF-16 -- settled empirically (headless Chromium, ASCII vs. Sinhala fill, identical character counts accepted) rather than asserted; confirmed code-unit metering | Storage ceiling paragraph, Method details |
| R1-13 | `z = 1.959964` is unnecessary notation for a general reader | Replaced with "Wilson score interval, 95%" verbatim as instructed (created a repetition with the adjacent "Wilson 95% CI" — fixed round 2, A2-2, with different exact wording) | Method validation, first Wilson CI mention |
| R2-8 | Table 3 restates the paragraph above it and overlaps Table 4 | Merge/cut proposed, not applied — awaiting confirmation | `SUBMISSION_NOTES.md` §9 |
| R1-16 | Figure 2's single-row layout unreadable at print column width | Rebuilt as 2x3 grid at native 3x-capture resolution (round 1); T-Junction panel's admin ID replaced with a placeholder (Part 0, round 2) | Figure 2 |
| R2-11 | "Related research article: None" vs. Background's mention of a corridor-level analysis | Cover-letter sentence drafted, field itself not changed | `SUBMISSION_NOTES.md` §8 |
| A2-1 | Table 2's concurrency text broke the table across two pages and displaced Figure 1 | Moved to a footnote; Table 2 now fits one page, Figure 1 sits with its caption | Table 2 |
| A2-2 | Wilson-CI phrase repetition from R1-13's literal replacement | Corrected wording, states the rounding convention applies to all intervals | Method validation |
| A2-3 | "Independent" contradicts the revised rater-bias disclosure | 4 instances corrected; 12 other instances found and reported for a ruling, not changed (`REVISION_CHANGELOG.md`) | Highlights, Method validation, combined paragraph |
| A2-4 | "At or above 98.3%/97.3%" survives in the combined paragraph | Replaced with explicit ranges per supplied wording | Combined six-module paragraph |
| A2-5 | Timing paragraph reads as self-contradictory | Corrected wording | Method validation, timing paragraph |
| A2-6 | Storage-ceiling revision answered the wrong question (bytes vs. code units, not UTF-8 vs. UTF-16) | Empirically measured, not asserted; task's suggested caveat sentence found incorrect given the result and not applied as literally worded (see changelog) | Storage ceiling paragraph |
| B1 | Admin ID weakness misattributed to platform | Widened to 12 chars (32-symbol alphabet); premise corrected (9,000 not 10,000 values); manuscript no longer attributes this to the platform; migration of existing IDs proposed, not applied | Security model |
| B2 | Uncaught QuotaExceededError | Tested first (silent tap loss confirmed empirically), then fixed in all six modules (persistent warning, forced sync, loud failure); finding preserved for the six validation sessions | Storage ceiling, Limitations, Table 2 |
| B3 | Representative-scenario load-test arithmetic (179 vs ~250 requests) | Reconciled from raw per-request timestamps (isSyncing guard + empty-queue skip, now documented); "6 taps/sec" confirmed correct, ambiguity explained rather than the figure replaced; mean-below-median explained | Offline-first data capture, Table 4 footnotes |
| B4 | Result-to-code-version mapping | `docs/RESULT_PROVENANCE.md` (supplementary); re-run-post-dedup question answered by reasoning from the fix's actual scope and the original logs' actual content, not re-run | Resource availability (pointer) |
| B5 | Dead gesture handler, data minimisation, site-detail check | Gesture handler NOT removed (its premise was false — verified); manuscript's own overclaim about visible-button coverage corrected; data-minimization schema proposed, not applied; site-detail field checked and confirmed absent | Data integrity safeguards |
| C1 | Main-road irreproducibility, video deleted | Independent search done (repo, full git history, all branches, disk) -- **found a candidate file outside the repository; reported, not resolved** | `REVISION_DECISIONS_NEEDED.md` |
| C2 | Five-module construction direction | Evidence reported (miss-row structure and position); no conclusion drawn | `REVISION_DECISIONS_NEEDED.md` |
| C3 | Inter-rater reliability, consent, setup-time questions, Figure 3 schematic | Recorded; question list drafted for operator training; no prose written | `REVISION_DECISIONS_NEEDED.md` |
