# Revision to-do

Author actions and pending items. Updated as each phase completes.

## Status

Phase 1 (recompute validation figures from committed data) is done --
see `docs/REVIEWER_RESPONSE.md` for R1-2, R1-4, R1-6, R1-9, R1-11.
Phases 2-5 have not been started. This file will grow as they proceed.

## Items requiring your decision (cannot be resolved in code)

These are listed as the task specified them, before Phases 2-5 have
surfaced anything further:

- **Ethics committee determination from University of Ruhuna** covering
  surveyor recruitment, including a "review not required" determination if
  that is the actual outcome (R1-8). Not something I can obtain or
  fabricate.
- **Decision on whether to run a paired comparison session** against a
  general-purpose platform (R1-1), to support the Background's comparative
  framing. If not run, the alternative is stripping that framing -- see
  Phase 5 when it runs; both versions will be drafted for you to choose
  between, per the task's own instruction.
- **Approval of the ADM identifier migration plan** before any
  implementation (R2-7b) -- not due until Phase 3.
- Phase 2 measurement items, individually, once Phase 2 actually runs and
  determines which ones can be measured for real versus which get marked
  `[MEASUREMENT PENDING]`.

## Phase 1 notes for the record

- `analysis/recompute_validation.py` computes every point-event and
  interval-module figure twice (with/without duplicates), all denominators
  labelled, full timing distributions and SD included. Output in
  `analysis/out/validation_recomputed.json` and
  `analysis/out/validation_recomputed_report.txt`.
- The Table 8 direction-accuracy correction (R1-2) changed two printed
  numbers (roundabout, t-junction) -- see `docs/REVIEWER_RESPONSE.md` for
  the exact old/new values and why.
- Main road's 0.37s timing figure is now shown as a distribution
  (145/80/2), reconstructed algebraically from already-published aggregate
  numbers, not from a retained raw file -- none exists (R1-4).
- No data was reconstructed or invented anywhere in Phase 1. Everywhere a
  number could not be verified against something committed, that is stated
  in the manuscript and in `docs/REVIEWER_RESPONSE.md`, not silently
  filled in.
