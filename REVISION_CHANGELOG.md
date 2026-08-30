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

## Round 2, Part B (repository/code changes)

### B1: Admin ID identifier space

Located the generator (`backend/master_apps_script.js`, `handleVerifyOTP`)
and its only functional call site. Frontend call sites checked: no
format-validating regex exists anywhere (`isValidAdminId` does plain
list membership, format-agnostic); only cosmetic placeholder text in
`index.html` and CLI help text in `tools/loadtest/loadtest.js` assumed
the old 4-digit format, both updated.

**Premise check: partially wrong, as found.** The prior manuscript and
the reviewer's comment both stated the identifier space as 10,000
values. From the actual generator (`Math.floor(1000 + Math.random() *
9000)`), the real space is **9,000** (1,000-9,999), not 10,000.
Enumeration at the 300/min rate limit is ~30 minutes, not ~33. Doesn't
change the conclusion (guessable either way), but the manuscript now
states the number the code actually produces, not the number a naive
digit-count would suggest.

Widened to `ADM-` + 12 characters from a 32-symbol alphabet excluding
confusable glyphs (0/O, 1/I, lowercase excluded entirely) --
~1.15x10^18 possible suffixes. No cryptographic RNG is exposed by Apps
Script (checked; only `Math.random()` is available), disclosed as such
in both the code comment and the manuscript rather than overclaiming
unpredictability.

Migration of the 12 already-issued 4-digit IDs is **proposed, not
implemented** -- `docs/ADMIN_ID_MIGRATION_PROPOSAL.md`, recommending a
coordinated one-time cutover (the same process already done by hand
once for `ADM-5505` in Part 0) over a compatibility-window or
do-nothing alternative. Awaiting approval before any live registry
write.

Manuscript's Security model subsection rewritten: no longer attributes
the weakness to "the same platform reason" as the OTP finding -- the
identifier space is the authors' own choice, unrelated to what Apps
Script exposes for caller-identity rate limiting. Added the
compounding-DoS note (enumerating the old space would have saturated
the shared rate limit for its full ~30 minutes, so a data-integrity
attack on one admin was simultaneously a DoS on every other admin on
the deployment). OTP paragraph strengthened with the actual cache TTL
(900s, confirmed from code) and the actual space (900,000 values, not
10^6 -- another premise correction), quantifying that a full-budget
guessing attempt covers ~0.5% of the space while consuming the entire
shared request budget for that window.

### B2: Uncaught `QuotaExceededError`

**Tested before fixing**, per instruction. Built
`analysis/quota_exceeded_probe.py`: fills `localStorage` to the exact
byte (binary search, same method as the A2-6 quota probe) against the
*real app* served over a real HTTP origin, then exercises the actual
tap path (`.vehicle-btn` click) and inspects queue/backup/counter
state before and after.

**Result, pre-fix:** the tap was silently lost. `QuotaExceededError`
thrown and uncaught inside `queueDataLocally`; neither the main queue
nor the backup queue was written; the on-screen counter did not
increment; no toast, no error, nothing visible to the surveyor. Page
remained responsive (no freeze), no corruption of the existing queue,
and a tap made after freeing space succeeded normally with no lasting
damage -- confirmed across two consecutive full-storage taps and one
post-recovery tap. Browser: headless Chromium 151.0.7922.34.

**Then fixed**, in all six modules (each has its own duplicated copy of
`queueDataLocally`, confirmed via grep before touching any of them):
both `localStorage.setItem` calls wrapped in try/catch; on failure, a
new `handleStorageFull()` logs loudly, shows a persistent on-screen
warning banner (not a 3-second toast -- stays until dismissed,
confirmed rendering correctly via screenshot), and attempts an
immediate sync in case draining the existing backlog frees space for
the next tap. Re-ran the probe against the patched code to confirm the
fix actually fires (it does) and that the previously-silent failure is
now loud.

**The finding is preserved, not erased**, per instruction: Storage
ceiling and Limitations both now state explicitly that the six
validation sessions ran under the old silent-failure behavior, since
none of them approached the ceiling and the fix postdates them. Table
2 gained a new row ("Storage-full failure handling") moving this item
from asserted-only to tested -- there was no existing row for it to
relabel, so one was added rather than repurposing an unrelated row
(the "Data recovery" row's "asserted from code inspection" language
covers the *export function*, a genuinely still-untested different
item, and was correctly left alone).

### B3: Load-test arithmetic reconciliation

**Why 179, not ~250** — settled from the raw per-request CSV timestamps,
not a hypothesis. Computed real inter-request gaps per surveyor
(16.3-25.7s, all above the nominal 15s interval, tracking each
surveyor's own average request latency). Confirmed from code that
`syncOfflineQueue()` returns immediately with no request sent if a
sync is already in flight (`isSyncing` guard) or the queue is empty --
neither was previously documented in "Offline-first data capture" as a
request-suppressing mechanism; both now are. Summing `600s /
avg_gap` across the six per-module rows gives ~177, matching the
observed 179.

**"6 taps/sec combined" -- not corrected to 5.71 as literally
instructed, and here's why.** Checked the harness source
(`tools/loadtest/loadtest.js`): tap generation stops exactly at the
600s nominal duration; the extra ~25s in the reported 625s total is a
pure drain tail with zero new taps generated. 3,570 events / 600s
(the actual generation window) = 5.95, essentially 6/s -- the existing
footnote is correct as a description of the generation rate. The
reviewer's 5.71 comes from dividing by the 625s figure, which includes
that drain tail and is therefore the wrong denominator for a
per-second generation rate. Per ground rule 5, corrected the
*ambiguity* (added the exact arithmetic and named the drain-tail
effect) rather than replacing an accurate figure with a less accurate
one.

**Mean (40.62) below median (50) in the worst-case row -- confirmed
and explained from the logs, not asserted.** The two figures measure
different things: 45.24 (this doc, and the harness's own summary JSON)
is the mean of the `batch_size` field across all 498 *attempted*
requests, including the 46 rate-limited failures (which all attempted
a full 50-event batch, since failures happen precisely when batches
are largest). Table 4's 40.62 is successful events (20,230) divided by
*all* 498 requests sent -- diluted by the 46 zero-yield attempts
without changing the size distribution of batches that actually
succeeded. Directly verified against the raw CSV: mean of the 452
successful-only rows is 44.76.

`docs/loadtest_results.md` updated with the full per-surveyor gap
table and the two-different-averages reconciliation, so this doesn't
read as an internal inconsistency in a future check.

### B4: Result-to-code-version mapping

`docs/RESULT_PROVENANCE.md` (recommended and placed as supplementary
material, with a one-sentence pointer added to Resource availability
in the manuscript body, per the task's own "recommend which"
instruction). Covers Table 4, all six validation sessions, the
password migration, and the idempotency confirmation, with commit SHA
and backend deployment state for each. Main-road's own result has no
committed source data to cite a SHA for -- stated plainly rather than
invented.

**Would re-running the load test post-dedup change the request count
or drain time?** Reasoned from what the dedup fix actually does
(rejects a retried batch after a lost acknowledgment following a
successful write) against what the original logs actually contain
(checked both CSVs directly): every logged outcome is `success` or a
clean `app_error` rate-limit rejection that never reached the
sheet-write step. Neither log contains the specific lost-acknowledgment
scenario the dedup fix addresses, and the fix doesn't touch sync
timing or batching logic at all -- so no change to request count or
drain time is expected under the same conditions. **Not re-run against
the live backend**, per instruction.

### B5: Repository items

**Dead code -- not removed, because it isn't dead.** Instructed to
confirm the visible "Export Local Backup" button works on the setup
screen and the active survey header before removing the five-tap
gesture handler. It does not: the visible button exists on the setup
screen of three modules only (main-road, roundabout, t-junction); the
other three (pedestrian, bus-idling, institutional-idling) have no
visible export control on *any* screen; and **no module has this
control on its active survey header at all**. The five-tap gesture is
the only mid-session export path that exists, in every module, and the
only export path of any kind in three of them. Removing it, as
literally instructed, would have deleted the only backup-export
mechanism for half the application's modules.

This also means the manuscript's existing claim -- "the control is now
also a labeled, visible button on both the setup screen and the active
survey header" -- was false as written, independent of the task's own
premise. Corrected in Data integrity safeguards to state the actual,
verified coverage, and to name this as a correction of an overclaim
found during this revision rather than passing over it silently. A fix
(extending the visible button to the active survey header of all six
modules, and to the setup screen of the three currently missing it) is
named as not-yet-implemented, not applied here, since it's a UI change
beyond the dead-code removal actually requested and the premise for
that removal didn't hold.

**Data minimization -- proposed, not applied**, per instruction.
`docs/DATA_MINIMIZATION_PROPOSAL.md`: replacing the free-text
`name` field with a decoupled surveyor identifier. Two designs
proposed (admin-assigned code vs. app-generated identifier); the
app-generated option recommended because it removes the free-text name
channel structurally rather than depending on a surveyor's compliance
with a relabeled field. Full list of what would need to change (six
`index.html`/`app.js` pairs, `backend/master_apps_script.js`'s column
mapping, `docs/DATA_SCHEMA.md`) is in the proposal. No live Sheet
touched.

**Site details -- checked, not found, not written into the
manuscript**, per instruction. Inspected all five `raw_matched.xlsx`
files in `data/validation/` directly (via `openpyxl`, all rows and
headers, not just a sample) plus `README.md` and
`validation_summary.json`. No location, site, address, or GPS field
exists anywhere in this dataset -- only date, time, direction/action,
vehicle-type, and count columns. The unrecorded-site-detail gap named
in the manuscript's Limitations cannot be resolved from this data.

## Part D verification (after Parts A2 and B)

- **Recomputed Tables 8/9 from source** (`python
  analysis/recompute_validation.py`): every figure currently in the
  manuscript matches exactly, `excluding_duplicates` branch, no
  disagreement -- 37/37, 36/37, 37/37 (institutional-idling); 147/148,
  147/147, 146/147 (roundabout); 91/92, 91/91, 90/91 (t-junction);
  11/11, 100%/100%/90.9% (bus-idling); 23/23, 100%/100% (pedestrian).
  Main-road (Tables 5/6/7) has no committed source to recompute against
  (Limitations, above; C1 below) -- checked for internal arithmetic
  consistency only, as in round 1.
- **Withdrawn 145/80/2 distribution**: confirmed absent from the
  manuscript as an assertion -- it appears once, correctly, as one of
  three admissible triples in the "no single distribution is stated"
  sentence. Still present, unchanged, in `docs/REVIEWER_RESPONSE.md`
  and `REVISION_TODO.md` -- not edited, per the standing instruction
  to notify before touching those files.
- **Grep for "at or above"**: zero remaining instances (A2-4 fixed the
  only one). **Grep for "up to"**: three instances, all legitimate
  technical descriptions of the actual 50-event batch cap, not
  overclaiming a range -- none needed fixing.
- **"Independent"/"independently"**: 12 remaining instances, all
  already reported for a ruling under A2-3 above; none newly found.
- **No Admin ID/PIN/sheet URL/email/personal name in any figure**:
  reconfirmed against the current compiled PDF (Figure 2's T-Junction
  panel shows `ADM-0000`, not a real ID) -- same check as Part 0, no
  regression.
- **Recompiled twice** (XeLaTeX), clean, 21 pages. No table spans a
  page break behind an oversized cell; no page is mostly whitespace.
- **Test suite**: this repository has no formal test framework
  (no `package.json`, no Jest/Mocha). `test.js` is the closest thing
  to one -- a standalone, DOM-mocked smoke test of legacy setup-screen
  logic. Ran clean (`node test.js`, exit 0, no output). **It does not
  exercise `queueDataLocally`, `handleStorageFull`, or any of the B2
  fix** -- it's a self-contained duplicate of older logic, not a
  `require()` of the actual `app.js` files, so it cannot cover code
  that didn't exist when it was written. B2's own verification
  (`analysis/quota_exceeded_probe.py`, run before and after the fix)
  is the real test coverage for that change. `patch.js` and
  `patch2.js` are one-off historical code-injection scripts from an
  earlier round, not tests -- not run, since re-running them would
  attempt to re-inject old code over this round's edits.
- **Outstanding from round 1, still outstanding**: the Table 3
  merge/cut proposal and the R2-11 cover-letter sentence
  (`MethodsX_latex/SUBMISSION_NOTES.md` §8-9) -- neither applied,
  awaiting the author's decision.

## Post-Part-D author decisions (29 Aug 2026)

Three items raised in Part 0/B/C put to the author directly. Recorded
here, not inferred.

- **C1 (`MainRoad.xlsx`)**: confirmed by the author to be a different,
  unrelated session (not the missing 14 July matched table). No
  manuscript change needed; `REVISION_DECISIONS_NEEDED.md` updated to
  mark this resolved.
- **B1 (Admin ID migration)**: **approved, Option B.** 12 new IDs
  generated (Python `secrets`, a real CSPRNG -- not bound by the
  in-app generator's `Math.random()` limitation, since this migration
  runs outside Apps Script). **Could not be completed end-to-end from
  here**: no deployed backend action accepts an admin-ID write (checked
  the full `handleRequest` action list directly), so the actual
  registry edit needs the same manual spreadsheet process used for the
  single `ADM-5505` rotation in Part 0, scaled to 12 rows. Email
  notification to each admin also cannot be done from here --
  `registry_info` deliberately does not return admin emails, so there
  is no recipient list available to this tool even if it could send
  mail. Full mapping table and exact instructions in
  `docs/ADMIN_ID_MIGRATION_PROPOSAL.md`. Manuscript's B1 paragraph
  left as "not-yet-executed" until the author confirms the live edit
  is actually done (re-check via `registry_info`, same as Part 0).
- **B5 (data minimization)**: **declined.** Author's reasoning:
  free-text names are easier for an administrator to manage day-to-day
  than distributing and tracking a separate ID per surveyor. Not
  implemented; `docs/DATA_MINIMIZATION_PROPOSAL.md` updated to record
  the decision.

## Round 3 (29 Aug 2026)

### Blocker 1 — ADM-5505 in Figure 2: premise did not hold, checked anyway

Read-only `registry_info` check (fresh, not relying on Part 0's earlier
read): `ADM-5505` is **not** in the live registry (12 admins present,
`ADM-7734` -- its Part 0 replacement -- is; `ADM-5505` is not). Figure 2
(`media/media/image2.png`) is confirmed byte-identical to the Part 0
placeholder build (`ADM-0000`, verified by hash, not regenerated) --
the file already shown to the reviewer describing this blocker is not
the file currently in the manuscript. No redaction needed; none applied,
since there is nothing live to redact. Figure 3 unchanged since Part 0's
check. Reported both facts (dead ID, already-fixed figure) rather than
silently no-op'ing or silently redoing already-complete work.

### Blocker 2 — revision-process narration removed

2a, 2b, 2c applied verbatim as supplied (Admin ID paragraph, Data
integrity safeguards paragraph, storage-ceiling sentence). 2d sweep
(`this revision`, `earlier draft`, `previously disclosed`, `overclaim`,
`corrected here`, `as stated`, mid-paragraph `\textbf{`): clean after
2a/2b's edits -- the only hits were inside the two paragraphs just
replaced. Two legitimate, unflagged occurrences of "as stated in Method
validation, above" remain (table captions, plain cross-references, not
narration). `docs/RESULT_PROVENANCE.md`'s pointer sentence in Resource
availability also checked by hand (not a sweep-term match) and judged
legitimate -- states which results predate two specific code fixes,
which is deployment provenance, not commentary on manuscript drafts.

### Blocker 3 — Table 2 / Limitations updated to match the body

Table 2's "Data recovery after backend unreachability" row:
Implementation cell now states the actual 3-of-6-modules,
no-active-header coverage; Verification cell notes the coverage claim
itself was confirmed by direct inspection of all six interfaces, not
merely asserted. Limitations' closing sentence about the manual export
corrected. **Found a second, uncorrected instance of the same overclaim
while checking this**, in Data integrity safeguards itself (right after
the paragraph 2b replaced: "...or use the manual export above") -- not
named in the task's list, fixed anyway since it was the same problem in
a second location, confirmed by visual page-render check, not caught by
grep alone (the sentence doesn't contain any of blocker 2d's sweep
terms).

### Blocker 4 — highlight bullet grammar

Applied verbatim as supplied.

### Final pass, numeric re-verification

Recomputed independently (not read off the manuscript): 9,000 (old
Admin ID space) and 30 min enumeration; 32^12 = 1.153x10^18, matches
the manuscript's 1.15x10^18; 900,000 OTP space and 0.5% coverage;
3,570/600 = 5.95. All match exactly, no disagreement. Table 5 sums
(231 = 157+33+24+8+6+3; 227/231=98.3%; 224/227=98.7%; 224/231=97.0%),
Table 4 (3,570/179=19.94; 20,230/498=40.62; 95.0%/97.5% reduction),
458 events/hour, 7.86x ratio, 508+34=542, and the 113s/225s/9s
discrepancy gaps all re-verified against source, exact match. Tables
8/9 unchanged since Round 2's Part D recomputation (no code touching
those figures this round). Recompiled twice, clean, 21 pages
(unchanged) -- no table spans a page break behind an oversized cell,
no figure orphaned from its caption. No Admin ID/PIN/URL/email/name in
any figure (unchanged since Part 0; no figure regenerated this round).

### Carry-forwards -- status, not re-litigated

- **B5 data minimization**: this round's prompt asks to "propose the
  surveyor-identifier schema change and show it before applying." **Not
  redone** -- the author explicitly declined this exact proposal earlier
  in this same session (stated reasoning: free-text names are easier
  for an administrator to manage than distributing per-surveyor IDs;
  `docs/DATA_MINIMIZATION_PROPOSAL.md` already records the decision).
  Flagged to the author rather than silently re-opening a decision
  already made, or silently ignoring the round-3 prompt.
- **Table 3 merge/cut, Figure 3 schematic, cover-letter sentence**:
  unchanged, still open, still in `MethodsX_latex/SUBMISSION_NOTES.md`
  §8-9 and `REVISION_DECISIONS_NEEDED.md`.
- **Part C (C1/C2)**: no new work requested beyond what
  `REVISION_DECISIONS_NEEDED.md` already contains -- C1 already marked
  resolved (author confirmed `MainRoad.xlsx` unrelated), C2's evidence
  already reported. Nothing to add.

## Round 3, follow-up (30 Aug 2026): Table 3 merge/cut applied

Author confirmed: cut Table 3, fold its one non-redundant row into the
"Offline-first data capture and batch synchronization" paragraph.

Table 3 (three-row qualitative comparison: requests-per-event, backend
executions, resilience to lost connectivity) removed entirely. Its one
row not already covered by the surrounding prose folded in as the exact
sentence from `SUBMISSION_NOTES.md` §9: "Unlike the original per-tap
version, where a lost connection made a tap fail or block, a lost
connection now leaves the event queued locally until the device
reconnects."

Every subsequent table renumbered down by one throughout the entire
manuscript (old Table 4 -> new Table 3, ..., old Table 9 -> new Table
8) -- captions, every in-text cross-reference, Table 2's
evidence-location column (`Table 5/6` -> `Table 4/5`, `Table 8/9` ->
`Table 7/8`), the abstract's `Tables 5--9` -> `Tables 4--8`, and the
combined six-module paragraph's `Tables 5 to 9` -> `Tables 4 to 8`.
Done with a single-pass, order-safe scripted substitution (not manual
find-and-replace, to avoid double-shifting a reference during a
multi-pass edit) and verified two ways: grepped the rebuilt source for
any remaining `Table 9` (none) and for the full renumbered caption
list (1-8, sequential, no gaps), then visually confirmed the rebuilt
PDF page by page -- new Table 3 (the load-test results table) sits
with its caption and both footnotes on one page, Table 2 still fits
on one page with correctly renumbered evidence-location references.

Recompiled twice, clean, 21 pages (unchanged net -- the removed table
and the added sentence roughly offset each other).

`MethodsX_latex/SUBMISSION_NOTES.md` §9 updated to record this as
done, keeping the original proposal text for the record.

## Round 3, follow-up 2 (30 Aug 2026): password paragraph reads as unfixed on a skim

Author flagged: the Security model paragraph opens "Administrator
passwords were found stored in plaintext..." -- true only historically,
but reads as a current-state claim to a reader who doesn't reach the
second sentence.

**Password paragraph restructured** to lead with the current, correct
state ("Administrator passwords are stored as salted SHA-256 hashes...
not plaintext"), then the best-practice caveat, then the historical
fact and fix timeline. Every fact preserved, only the order changed.

**While checking for the same pattern elsewhere, found a second,
genuine self-narration miss from Blocker 2's round-3 sweep**: the
idempotency paragraph read "before this method's current revision, the
backend could not recognize a retried batch..." -- literal
manuscript-revision-history language, the exact thing Blocker 2 was
supposed to remove, missed because the sweep's search terms (`this
revision`, `earlier draft`, etc.) didn't match this specific wording.
Restructured the same way: now leads with "idempotency now protects
against," states the fix and its live confirmation first, then explains
that the load test itself predates the fix (a real methodological
caveat about that test, not commentary on the manuscript's drafts).

Checked the rest of the manuscript for the same pattern (grep for
`before this`, `prior to this`, `earlier version of this`, `current
revision`) -- only these two paragraphs matched; the other legitimate
match ("Administrators who registered before this migration...") refers
to a real operational migration event, not the manuscript's revision
history, and was left alone.

Recompiled twice, clean, 21 pages (unchanged). Two new minor underfull
hboxes on the idempotency paragraph's page (cosmetic line-spacing only,
same class of pre-existing warning as elsewhere in this document).

## Round 3, follow-up 3 (30 Aug 2026): main-road reproducibility and footage-retention timing corrected

Author corrected two claims in this session, both applied:

1. **Limitations' main-road reproducibility sentence overstated
   impossibility.** The video and an export of the app's own counts
   for the 14 July session are still retained by the author (outside
   this repository); only the specific matched comparison isn't
   currently locatable. Manuscript no longer says re-derivation
   "cannot" happen from "anything currently committed" -- states the
   raw materials are retained and re-matching has not been done.
2. **Ethics statement claimed footage was already deleted "upon
   submission."** This manuscript has not been submitted yet, and the
   author confirmed the actual policy is deletion after publication is
   approved. Corrected from past tense (already deleted) to present/
   future tense (retained now, will be deleted once approved) for all
   six sessions.

Consequence for C3 (`REVISION_DECISIONS_NEEDED.md`): since footage is
not actually gone, inter-rater reliability is reopened as a genuine
possibility before publication -- previously recorded as closed
because the manuscript said footage was deleted.

Recompiled twice, clean, 21 pages (unchanged).

## Round 3, follow-up 4 (30 Aug 2026)

Added verbatim, closing sentence of Limitations (no separate
Conclusion section exists in this template): "Future validation should
include independent raters, additional locations, and different
environmental conditions." Recompiled clean, 21 pages.

## Round 3, follow-up 5 (30 Aug 2026): main-road fully re-derived, C1 resolved

The author supplied a complete re-analysis of the 14 July source video
(`video/App Count.xlsx`, both road directions, columns Date/App
Time/App Direction/App Vehicle Type/Video Time/Video Direction/Video
Vehicle Type), replacing the matched table that C1's independent
search confirmed does not exist anywhere in this repository or its
history. Committed to `data/validation/main-road_2026-07-14/raw_matched.xlsx`
(the raw video files themselves, ~1.6GB, were not committed --
consistent with the other five modules, which also commit only the
matched spreadsheet, not raw footage). `analysis/recompute_main_road.py`
recomputes every figure from it, using the exact same Wilson-CI and
rounding convention as `analysis/recompute_validation.py`
(z=1.959964, round-half-away-from-zero, 1 decimal place).

**Every main-road figure in the manuscript changed. Full before/after:**

| Figure | Previously published | Recomputed from the new data |
|---|---|---|
| Video-confirmed vehicles | 231 | 448 |
| Application entries | 230 | 444 |
| Matched pairs | 227 | 444 |
| Missed by application | 4 | 4 |
| Unmatched application entries (false positives) | 3 | 0 |
| Misclassified | 3 | 1 |
| Detection recall | 98.3% [95.6, 99.3] | 99.1% [97.7, 99.7] |
| Detection precision | 98.7% [96.2, 99.6] | 100.0% [99.1, 100] |
| Classification accuracy | 98.7% [96.2, 99.5] | 99.8% [98.7, 100.0] |
| Detected + correctly classified | 97.0% [93.9, 98.5] | 98.9% [97.4, 99.5] |
| Mean timing offset | 0.37s (mean absolute, from aggregate only -- underlying per-vehicle distribution previously non-unique, see below) | -0.065s signed / 0.164s mean absolute (SD 0.411), from real per-vehicle data |
| Within 1s / within 2s | 99.1% / 100% | 99.5% / 100% |
| Per-class counts (Bike/Tuk-tuk/Car/Truck/Bus/Van) | 157/33/24/8/6/3 (sum 231) | 304/63/49/17/9/6 (sum 448) |
| Discrepancies (Table 5/6) | 10 (4 missed, 3 misclassified, 3 unmatched) | 5 (4 missed, 1 misclassified, 0 unmatched) |
| Per-direction breakdown | Not available (named limitation) | Now available: Galle 217 confirmed/215 detected, Wakwella 231/229 |
| Field rate (events/hour) | 458 | 889.1 |
| Storage-ceiling time-to-full at field rate | 21-25 hours | 10.9-12.9 hours |
| Point-events total (main-road + 3 other modules) | 508 | 725 |
| Grand total video-confirmed observations | 542 | 759 |
| Module-level recall range (all six modules) | 98.3-100% (main-road was the floor) | 98.9-100% (t-junction is now the floor; main-road's own 99.1% is no longer the minimum) |

**Removed as no longer applicable, not just updated:** the previous
timing paragraph's "distribution cannot be recovered uniquely, three
admissible triples" reasoning -- moot now that exact per-vehicle timing
exists. The "alternative reading" sensitivity paragraph about the three
unmatched entries and a possible mistimed-and-misclassified single
vehicle (113s/225s/9s gaps, 228/231 and 224/228 alternate figures) --
this dataset has zero unmatched entries, so there is no ambiguity left
to offer an alternative reading of. The Limitations sentences claiming
the matched table "was not retained" and "cannot be independently
re-derived" -- replaced with a statement that the table is now
committed and the figures were recomputed directly from it.

`docs/MAIN_ROAD_DISCREPANCY_ANALYSIS.md` fully rewritten (5
discrepancies, new binning, no more tolerance-sensitivity/unmatched-entry
sections since neither applies to this data). `data/validation/README.md`
updated to include main-road, no longer stating it's excluded.
`docs/RESULT_PROVENANCE.md` and `docs/STORAGE_CEILING_ANALYSIS.md`
updated for the new field rate and committed data source.
`REVISION_DECISIONS_NEEDED.md` C1 marked resolved.

Recompiled twice, clean, 20 pages (down from 21 -- Table 5 shrank from
10 rows to 5, and several paragraphs shortened once the non-uniqueness
and alternative-reading reasoning no longer applied).
