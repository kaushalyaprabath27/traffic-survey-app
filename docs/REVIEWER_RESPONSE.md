# Reviewer response

One entry per comment. Phase 1 only (validation-figure recomputation); Phases
2-5 are not yet addressed -- see the phase-gating note in the commit history
and `REVISION_TODO.md`.

## R1-2 -- denominator inconsistency in Table 8 (highest priority)

**Confirmed, not refuted.** `analysis/recompute_validation.py` recomputes
every proportion in Table 8 with its denominator stated explicitly, and
compares against both `data/validation/match.py`'s own stored output
(`validation_summary.json`) and the manuscript's previous printed values.

Finding: `match.py`'s own `dir_acc` field is computed as
`wilson_ci(n_correct_dir, n_detected)` -- the same denominator convention as
classification accuracy. But the manuscript's previously printed
"Direction acc." column did not match that stored value for either module
with a missed detection. For roundabout and t-junction, the printed
direction-accuracy figures were in fact identical, digit for digit, to the
Detection recall column in the same row -- not an independent computation
at all, evidently copied across at some point rather than computed.

Corrected in Table 8 to the values `match.py` itself actually computes
(matched-event denominator, consistent with classification accuracy):

| Module | Old (uncorrected) | New (corrected) |
|---|---|---|
| Institutional-idling | 100% [90.6, 100] | unchanged -- denominators coincide (0 missed) |
| Roundabout | 99.3% [96.3, 99.9] (= recall, copied) | 99.3% [96.2, 99.9] (146/147) |
| T-junction | 98.9% [94.1, 99.8] (= recall, copied) | 98.9% [94.0, 99.8] (90/91) |

The task's own conditional instruction was: drop the column if direction
accuracy over matched events is 100% for all three modules. It is not --
roundabout and t-junction each have exactly one real direction mismatch
among their detected events, previously invisible because it was masked by
the wrong denominator. Column kept, values corrected, denominator
convention now stated explicitly in the Table 8 caption.

Table 5, 7, and 9 checked for the same issue: not applicable. Table 5 has
no direction-accuracy figure (main-road's per-direction breakdown was never
separated out at all -- see R1-4/R1-5). Table 7 has no direction column.
Table 9's "crossing-direction counts" are a count-field match (countIn/
countOut equality), a different metric with no comparable denominator
ambiguity.

## R1-6 -- matching algorithm

**Two different answers for two different datasets, neither of which can be
"implemented in the script" as literally requested, and said so rather than
forcing an implementation that doesn't correspond to what happened.**

Five-module data (institutional-idling, roundabout, t-junction, bus-idling,
pedestrian): there is no matching algorithm to implement. `data/validation/
README.md` already stated this; it is now also stated in the manuscript's
own Method-details text. The five spreadsheets arrive already paired --
a human reviewer matched each app-logged event to its video-derived
counterpart by eye when the spreadsheet was built. There is no tie-breaking
rule to state because there was no algorithm making the choice.
`recompute_validation.py` computes statistics from the pairing as given,
same as `match.py`.

Main-road: the manuscript's existing text already described a real
algorithm -- nearest-timestamp match within a two-second tolerance. Now
made explicit: this is a greedy nearest-neighbour match, not a globally
optimal one-to-one assignment. Whether any vehicle fell in a contested
window (close enough in time to more than one candidate) cannot be checked,
because the raw unmatched timestamp lists needed to check it were not
retained -- confirmed absent by repository search, not assumed (see R1-4).

## R1-9 / R1-Minor -- timing precision

Main road: replaced the bare 0.37 s mean with the full integer-second
distribution -- 145 vehicles at 0 s difference, 80 at 1 s, 2 at 2 s.
**Provenance stated explicitly in the manuscript, not hidden**: this
distribution was not read from a retained per-vehicle file (none exists --
see R1-4). It was reconstructed algebraically from the aggregate figures
the manuscript already published (N=227, mean=0.37s, 99.1% within 1s, 100%
within 2s) -- a unique integer solution to those four already-public
numbers, checked to reproduce them exactly:
`(0*145 + 1*80 + 2*2)/227 = 0.3700...`, `(145+80)/227 = 99.1%`. This is a
derivation from committed numbers, not new data.

Table 8: added SD to the timing-error column for all three modules
(institutional-idling 0.52, roundabout 1.02, t-junction 1.38 -- from
`recompute_validation.py`, matching `match.py`'s own stored values), and
extended the ±0.5-second ground-truth-resolution caveat that main road
already carried to cover this column too, since the five-module video is
at the same one-second resolution.

## R1-11 -- duplicates

Per-file counts added to the manuscript (previously only in
`data/validation/README.md`, not in the manuscript itself): institutional-
idling 2, roundabout 2, t-junction 3, bus-idling 0, pedestrian 0.

Every headline figure now computed both ways (`recompute_validation.py`'s
`excluding_duplicates` / `including_duplicates` variants, in
`analysis/out/validation_recomputed.json`). Including the duplicates moves
every reported proportion by at most 0.1 percentage points -- stated in the
manuscript with the specific comparison for the three point-event modules,
rather than asserted generally.

## R1-4 -- main-road deposit

**Searched, not found, said so.** Checked every file under
`data/validation/`, the whole repository tree, and full git history
(`git log --all`) for any retained per-vehicle matched table for the 14
July main-road session. None exists in any form, at any commit. Nothing
was deposited under `data/validation/main_road/`, because there is nothing
to deposit -- creating a placeholder directory would misrepresent what is
and is not committed.

One sentence added to Limitations: the full 227-pair matched table (not
just the ten discrepancies already in Table 6) was never retained as a
file, this is confirmed by a repository-wide search including history, and
the main-road result cannot be independently re-derived from anything
currently committed.
