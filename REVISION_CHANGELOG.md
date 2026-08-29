# Revision changelog — MethodsX revision

Round 1: Part A only (manuscript text edits). Round 2 adds Part 0
(critical, done first) and Part A2 below.

All manuscript edits are in `MethodsX_official_template_filled.tex`
(outside this repository, at `MethodsX_latex/`, not under version
control — changes below are described by location, not by diff hunk).

## Round 2, Part 0 (critical — live Admin ID published in Figure 2)

Confirmed via a read-only `registry_info` call against the live
production backend: `ADM-5505`, visible in the T-Junction panel of
Figure 2, was a real, currently registered Admin ID (one of 12),
routing to a real administrator's Sheet on the shared production
backend. Checked every other panel of Figure 2 and all of Figure 3;
no other identifier found (see `figures/README.md` for the full
per-panel account).

Two actions taken, by different people:
- **Figure fix (this repository):** `take_screenshots.py`'s demo
  `admin=` parameter changed from `ADM-5505` to `ADM-0000` (outside
  the ID generator's real output range, so it can never collide with
  a live ID). Screenshots and the Figure 2 composite regenerated;
  manuscript recompiled clean at 20 pages. Commit `00fe3d5`.
- **Live backend (author, not this tool):** `ADM-5505` rotated to
  `ADM-7734` directly in the registry spreadsheet, verified by two
  successive `registry_info` reads before/after. The account belongs
  to the author, so no third-party notification was needed. Not
  performed by this tool — editing the live registry was explicitly
  out of scope for automated action per the task's own instruction
  ("Do not retire, rotate, or regenerate the ID yourself. That
  decision is mine").

## Round 2, Part A2 (regressions from round 1)

### A2-1

Round 1's Table 2 concurrency-headroom sentence, placed inline in the
Verification cell, made that cell ~40 lines deep, split Table 2 across
two pages with a repeated header, and displaced Figure 1 from its
caption. Moved the sentence to a table footnote (`\textsuperscript{a}`
marker in the cell, footnote text below the caption), matching the
footnote convention Table 4 already uses. Verification cell restored to
end at "28.6-minute drain". Recompiled: Table 2 now fits on one page,
Figure 1 sits with its caption, and the manuscript is a page shorter
overall (20 -> 19 pages) as a direct result of removing the forced page
break this caused.

### A2-2

`z = 1.959964` \to "Wilson score interval, 95%" (round 1, A10/R1-13)
created a repetition with the already-present "Wilson 95% CI" a few
words earlier in the same sentence. Replaced per the exact text
supplied: "...all intervals in this manuscript are Wilson score
intervals at 95%, rounded to one decimal place using
round-half-away-from-zero". The repetition is gone; the sentence now
also states the rounding convention applies to *all* intervals, not
just this one, which is actually more accurate than round 1's version
(round 1's phrasing technically only scoped the convention to the
sentence it was in).

### A2-3

Four "independent"/"independently" instances replaced verbatim per the
supplied table, since the ground-truth rater (Limitations) is not
independent of the software (also its developer):

- Highlight bullet 2
- Method validation, opening sentence
- "Validation of the remaining five modules" opening sentence
- The combined six-module paragraph

**Applying the highlight-bullet replacement verbatim produces "...
against a separately extracted video record, against real field data,
..." -- a repeated "against" construction**, since the original
sentence already had "against real field data" after where the
replacement text ends. Applied exactly as supplied per the
no-paraphrase rule; flagged here rather than smoothed, same as
R1-13 in round 1.

"The video recording was reviewed independently, frame by frame"
(Ground-truth extraction) was left unchanged, per instruction --
"independently" there means separately from the application's own
output, a claim the manuscript defends and which remains accurate.

**Full remaining-instance search, reported for a ruling, not decided
here:**

| Line | Sentence | Note |
|---|---|---|
| 129 | "...reported independently of that analysis's status" (Related research article field) | Different meaning: independence of this article from the unpublished companion study's status, not a validation-independence claim |
| 215 | "...asserted from documentation (relied on a vendor's stated behavior without independent confirmation)" | Table 2 intro prose, describing the verification-method legend itself |
| 239 | "...connection-independent operation" (Table 2, Offline operation row) | Describes the service worker's operation mode (not requiring a connection), unrelated to rater independence |
| 242 | "Persistent local backup independent of the sync queue" and "not independently tested end-to-end in a browser" (Table 2, Data recovery row) | Two instances; first describes architectural separation from the sync queue, second is a testing-coverage caveat |
| 253 | "...independently reviewed and verified the resulting behavior against those requirements..." (AI-assisted tools disclosure) | Describes author review of AI-assisted output, not rater independence |
| 255 | "...asserted from code inspection without independent dynamic testing" (Figure 1 intro) | Evidence-level legend, same usage as line 215 |
| 281 | "A background timer, independent of user interaction" and "has not been independently confirmed by the authors' own load-testing" | Two instances; first is a timer-mechanism description, second a caveat on a vendor performance claim |
| 363 | "...retained independently of the periodic queue..." (persistent backup paragraph) | Architectural-separation usage, same pattern as line 242 |
| 601 | "...the duplication is independently checkable rather than silently corrected away" | Describes reader-checkability of the excluded-duplicates decision |
| 609 | "...not against an independently taken row count in the target sheet" (Limitations) | Describes a load-test reconciliation gap |
| 617 | "...not independently against rows physically present in the sheet" (worst-case load-test paragraph) | Same load-test reconciliation caveat as line 609, different location |
| 625 | "...used by multiple independent researchers for real data collection" (Resource availability) | "Independent" here means separate/unrelated researchers sharing the deployment, not a validation claim |

None of these read to me as bearing on rater independence -- they're either a different sense of "independent" (separate, unrelated, not-connection-dependent) or already-hedged evidence-level language (Table 2's own legend, Figure 1's caption). Flagging all twelve per instruction rather than filtering any out myself.

### A2-4

"Detection recall is at or above 98.3%... classification accuracy is at
or above 97.3%..." (combined six-module paragraph) replaced with the
exact range-based text supplied, in the same paragraph as A2-3's fourth
edit.

### A2-5

"...is a distribution over {0, 1, 2}, not a sub-second measurement"
(main-road timing paragraph) \to "...means the differences take only
the integer values 0, 1 or 2, not a sub-second measurement", per the
exact text supplied. Removes the apparent contradiction with "No single
distribution is therefore stated" two sentences earlier.

### A2-6

Built `analysis/storage_quota_probe.py` (+ `analysis/_quota_probe.html`,
the served test page) to settle the metering question empirically
rather than by assertion, since the round-1 text answered a different
question (UTF-8 vs UTF-16 code units, which coincide for ASCII data by
construction) than the one actually in dispute (code units vs. raw
bytes).

Method: fill `localStorage` to its limit via binary search on string
length, in a real HTTP origin (not `about:blank`/`data:`, which throw
`SecurityError` on `localStorage` access before any quota question can
be asked), once with an ASCII fill character and once with a Sinhala
character (Basic Multilingual Plane, 1 UTF-16 code unit, 3 UTF-8 bytes).

**Result (Chromium 151.0.7922.34, via Playwright): both fills accepted
exactly 5,242,875 characters before `QuotaExceededError`.** Identical
character counts despite a 3x difference in UTF-8 byte size confirms
the tested browser meters `localStorage` quota in UTF-16 code units,
not raw bytes. Tested in one browser engine/version only; not repeated
across others, and the manuscript now says so explicitly.

**Disagreement with the task's specified caveat text, not applied as
written:** the task asked for a sentence stating "non-Latin surveyor
names -- Sinhala or Tamil, at one to two UTF-16 code units and three
UTF-8 bytes per character -- would lower [the ceiling]". Given the
measurement above, **this is not correct**: Sinhala and Tamil are both
entirely within the Basic Multilingual Plane (1 code unit per
character, same as ASCII), so under confirmed code-unit metering they
cost the *same* quota per character as ASCII and would not lower the
ceiling. This claim would have been correct only under the byte-metering
assumption the measurement just ruled out. Per ground rule 5 ("if a
repository fact contradicts a reviewer's premise, say so rather than
editing to match the reviewer"), the manuscript states the corrected
version instead: non-Latin input from the BMP does not lower the
ceiling, and only input requiring UTF-16 surrogate pairs (outside the
BMP, e.g. some emoji) would cost more code units -- and no such input
is expected in any of this application's fields.

`docs/STORAGE_CEILING_ANALYSIS.md` updated to match: the previous
assertion-based "browsers meter in code units" claim replaced with the
measurement and its method, plus the corrected non-ASCII consequence.

## Round 2 verification (Part A2 scope only -- full Part D pass still pending Part B)

- Recompiled twice (XeLaTeX), clean. 19 pages (down from 20; A2-1's
  footnote fix removed a forced page break).
- Table 2: fits on one page, footnote renders correctly below the
  caption. Figure 1: sits with its caption, no displaced blank page.
- Figure 2: T-Junction panel confirmed showing `ADM-0000`, not
  `ADM-5505`, in the compiled PDF.
- Visual check of Table 7/8/9 area (pages 13-14, where the log flagged
  a non-fatal "Infinite glue shrinkage" warning): renders correctly,
  no visible corruption; pre-existing longtable/caption interaction
  from round 1, not introduced by any A2 edit.

## A1 (R1-1, R1-9)

Verified independently from Table 6's own timestamps before touching
anything: bin vector is `1, 0, 2, 3, 4, 0`, window 1 has 1 (not 0),
windows 3-5 sum to 9, window 6 is 314s = 5m14s. Manuscript's binning
sentence corrected to match; interpretive gloss ("a concentration in the
middle... not a rise sustained to the end") deleted per the reviewer's
recommendation, since the authors' own conclusion (too few events to
interpret) makes it superfluous. Same fix applied to
`docs/MAIN_ROAD_DISCREPANCY_ANALYSIS.md`, which had the identical
self-contradiction (its own table was correct; its prose was not).

## A2 (R1-2)

Verified independently: three integer triples — (146,79,2), (145,80,2),
(144,81,2) — all reproduce N=227, mean=0.37s, 99.1% within 1s, 100% within
2s. The manuscript's prior "145/80/2" presented one arbitrary member of
this set as if unique. Replaced with a statement that the distribution
cannot be recovered uniquely, listing all three triples, per the
reviewer's stated preference (report only the retained aggregates).

**Found, not yet acted on**: the same "145/80/2" distribution still
appears in `docs/REVIEWER_RESPONSE.md` (2 places) and `REVISION_TODO.md`
(1 place) — internal process docs, not the manuscript. Per instruction,
not edited without confirmation.

## A3 (R1-6)

Table 8 column header: "Timing err. (s)" -> "Timing offset (s)". Caption
sentence replaced with the exact text supplied, stating the offset
combines logging latency with unmeasured device clock offset. The
existing ±0.5s resolution sentence left unchanged.

## A4 (R1-10, R1-11)

Deleted the revision-history sentence from the Table 8 caption (moved to
this changelog instead, where it belongs). Added exact fractions to every
percentage in Table 8, Table 9, read from
`analysis/out/validation_recomputed.json` / a fresh run of
`analysis/recompute_validation.py` — matched the task's expected table
exactly (institutional-idling 37/37, 36/37, 37/37; roundabout 147/148,
147/147, 146/147; t-junction 91/92, 91/91, 90/91), no disagreement to
report. Tables 5 and 7 already show the numerator/denominator via their
own separate Count/n/Detected/Correct columns; not further duplicated
with parenthetical fractions, since the ambiguity that motivated this
fix (two identical-looking percentages, different denominators) does not
exist in either of those tables. Caption split into two shorter
paragraphs.

## A5 (R1-12)

Verified 228/231 = 98.7%, 224/228 = 98.2456...% -> 98.2% (not 98.25 as a
naive 2-decimal read might suggest) under round-half-away-from-zero.
Sensitivity sentence inserted verbatim after the existing discrepancy
discussion.

## A6 (R1-7, R1-8)

Abstract: "up to 97.5%" -> "95.0-97.5%... across two load-test scenarios".
"detection recall at or above 98.3% and classification accuracy at or
above 97.3% throughout" -> "module-level detection recall of 98.3-100%
and classification accuracy of 97.3-100%, with wide confidence intervals
for the smaller-sample modules (Tables 5-9)". Third highlight bullet
checked: no "up to" phrasing to align.

**Abstract grew to 205 words (over the 200 limit) as a direct result of
using the reviewer's exact replacement text.** Trimmed 6 words elsewhere
in the abstract (not touching either mandated replacement) to bring it to
199: "rapid event logging" -> "rapid logging"; "independently validated"
-> "validated"; dropped "against the real backend" from the load-test
sentence (redundant with "real production backend" already stated in the
third highlight bullet).

## A7 (R1-4)

Limitations rater-bias paragraph replaced with the exact text supplied.
Checked for duplication against Method validation's operator-independence
statement first: no duplication found (that statement covers who
operated the app vs. who rated the footage; this one covers the rater's
dual role as developer and non-blind status -- a different point). Method
validation left unchanged.

## A8 (R2-5)

Table 2, "Concurrent multi-surveyor use" row, Verification cell: appended
the exact sentence supplied, separating the deployment-specific
concurrency headroom from the software's own (transferable) request-
reduction property. Measured numbers in that cell unchanged.

## A9 (R2-6)

Read `docs/STORAGE_CEILING_ANALYSIS.md`'s actual derivation before
recomputing anything. **Finding: the document does not support a
factor-of-two spread**, and I did not manufacture one. The document
states, and I independently confirm from the same source, that every
field in the measured event data is plain ASCII, so UTF-8 byte count and
UTF-16 code-unit count are numerically identical for this specific data
-- the reviewer's general point about browsers metering UTF-16 code
units is correct, but its consequence (~2x range) does not apply here
because there is no non-ASCII content to cause the divergence. Pulled
this reasoning into the manuscript body (previously only in the
supporting doc), rather than stating a range the evidence does not
support.

## A10

- **R1-13**: `$z=1.959964$` -> "Wilson score interval, 95%", applied
  literally as instructed. Note: this creates a "Wilson 95% CI ...
  Wilson score interval, 95%..." repetition in the same sentence, since
  "Wilson 95% CI" is already stated earlier in that sentence. Not
  smoothed, per the no-paraphrase instruction -- flagged here instead.
- **R2-8**: Table 3 merge/cut proposal drafted in
  `MethodsX_latex/SUBMISSION_NOTES.md` (section 9). **Not applied**,
  awaiting confirmation, per instruction.
- **R1-16**: Figure 2 rebuilt as a 2x3 grid (was a single row of 6).
  Regenerated at the screenshots' native 3x-device-scale-factor
  resolution (3588x4146px, 500dpi), not upscaled. Manuscript grew from
  18 to 20 pages as a direct result (Figure 2 now needs a full page to
  itself; the preceding page has empty space rather than a split figure
  -- consistent with the layout precedent set in an earlier round, not
  fought).
- **R2-11**: Cover-letter sentence drafted in
  `MethodsX_latex/SUBMISSION_NOTES.md` (section 8). The "Related research
  article: None" field itself **not changed**, per instruction.

## Verification

- Recompiled twice (XeLaTeX), clean, 20 pages.
- Citation coverage: all 12 references cited both directions, checked
  programmatically.
- Table/figure numbering: Tables 1-9, Figures 1-3, sequential, unchanged
  by any Part A edit.
- Abstract: 199/200 words (144 prose... see note above -- combined count
  is what's tracked against the limit).
- Background: 495/500 words, untouched by any Part A edit.
- Withdrawn "145 vehicles" distribution: confirmed absent from the
  manuscript (present in `docs/REVIEWER_RESPONSE.md` and
  `REVISION_TODO.md` only -- reported above, not edited).
