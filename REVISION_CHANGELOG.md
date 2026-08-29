# Revision changelog — MethodsX revision r1

Part A only (manuscript text edits). Part B (repository/code changes) not
started — stopping here per the task's explicit instruction to show the
rebuilt manuscript before starting Part B.

All manuscript edits are in `MethodsX_official_template_filled.tex`
(outside this repository, at `MethodsX_latex/`, not under version
control — changes below are described by location, not by diff hunk).

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
