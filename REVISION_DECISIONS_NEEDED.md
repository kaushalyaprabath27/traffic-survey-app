# Decisions needed from the author (Part C)

Per instruction: no manuscript edits for any item below, no drafted
text, nothing marked resolved. Report only.

---

## C1 — Main-road reproducibility: independent search, found something

**Update (30 Aug 2026):** author confirmed `MainRoad.xlsx` (below) is a
different, unrelated session — that part stands resolved. The author
also states the 14 July video and an export of the app's own counts
for that session are both still retained (outside this repository, not
currently locatable as a specific file, but not deleted). Limitations
updated accordingly: the raw materials are retained and re-matching
has not been done, rather than implying re-derivation is impossible.
**Not re-derived here** — that would mean re-matching ~230 events
against video, real work, not something to do without being asked.

### What was searched

- **This repository, current working tree**: `git ls-files` filtered to
  every data-shaped extension (`.csv .xlsx .xls .json .ipynb .parquet
  .tsv`).
- **Full git history, all local branches** (`main`,
  `methodsx-review-response`, `methodsx-revision-r1`,
  `methodsx-revision-r2`, `methodsx-submission-fixes`, plus their
  `origin/*` remotes) and **all commits**, for any file matching those
  extensions or a main-road/matched-table naming pattern ever added and
  later removed.
- **Unreachable git objects** (`git fsck --unreachable`): one found — an
  earlier draft of `take_screenshots.py` from before an amend, not a
  data file.
- **`.gitignore`'d paths still present on disk**: the ignore list only
  covers `node_modules/`, logs, editor/OS metadata, and two specific
  local-backup export filenames — nothing that would hide a main-road
  dataset. Confirmed no untracked/ignored data-shaped files exist on
  disk in the repository at all (`git status --porcelain --ignored`
  plus a direct filesystem `find`).
- **The wider `Desktop/PB` directory** (sibling `New folder/`, outside
  git): five `.xlsx` files matching the five non-main-road validation
  modules by name (`Bus idling.xlsx`, `Institutional idling.xlsx`,
  `Pedestrian.xlsx`, `Roundabord.xlsx`, `T junction.xlsx`) — no
  main-road file among them.
- **The user's Desktop more broadly** (two levels deep): every `.xlsx`/
  `.csv` file found, by folder.

### What was found — three candidates, none of them the missing table

Three files outside the repository had names suggestive enough to open
and check (headers and enough rows to characterize them — not read in
full, not analyzed beyond what's needed to identify what each one is):

1. **`Desktop/Analyzed Researcg Data/Main Road Data.xlsx`** — three
   sheets, all **aggregate 15-/10-minute-bin vehicle-type tallies**
   (`Time, Location, Direction, Vehicle Type, Number`), not per-vehicle
   rows. Every time bin across all three sheets falls between **06:30
   and 08:00**. The manuscript's reported session is **13:32:22 to
   14:02:36**. Different time-of-day entirely, and aggregated rather
   than per-vehicle regardless — this is not the missing table, though
   it may be from the corridor-level companion study (location
   "Juulgaha junction, Galle" matches the region named in that study's
   working title).
2. **`Desktop/Research Data/MainRoad.xlsx`** — **this one is
   structurally close**: per-row columns `Name, Location, Location
   number, Date, Time, IN/OUT, Vehicle Type`, matching the app's own
   event schema. But every one of its **4,481 rows is dated 5 May
   2026** — not 14 July 2026 — across two surveyors ("Buwaneka":
   2,381 rows; "Deelaka": 2,100 rows) and two location numbers (15,
   1). The manuscript states one trained surveyor for the 14 July
   session. No video-derived column exists in this file at all — it
   looks like raw app output (or a manual log in the same shape) from
   a **different, apparently larger and earlier session**, not a
   video-matched table for the reported one.
3. **`Desktop/Research/Validation data.xlsx`** — ruled out on
   inspection: 88 sheets of SUMO traffic-simulation calibration
   iterations (observed-vs-simulated flow, GEH statistic, sublane
   model tuning notes) for what reads as the companion corridor-level
   study. Unrelated to video-vs-app validation.

### Why this changes the decision

Item 2 exists, is real, sits outside version control, and its
existence was not something this repository's own Limitations text
accounted for — that text states the per-vehicle matched table "does
not exist in any committed form" and "cannot be independently
re-derived from anything currently committed." Both of those statements
are about *this repository*; neither claims to have searched the
author's own machine, and this file was not found in the repository. It
does not appear to be the missing 14 July matched table itself (wrong
date, wrong surveyor count, no video column), but the author was
present when these files were created and should confirm what it
actually is before this manuscript states no such data exists anywhere.
**This is exactly the kind of finding the task said would change the
decision — surfaced immediately, not folded into the rest of this
memo.**

---

## C2 — Five-module pairing direction: what the artifacts show

Inspected `data/validation/*/raw_matched.xlsx` directly (row-by-row,
all three point-event modules: institutional-idling, roundabout,
t-junction) and `analysis/recompute_validation.py` / the
`data/validation/README.md` methodology note. Evidence only, no
conclusion drawn on your behalf:

- **Miss rows exist and are structurally asymmetric, not just
  numerically absent.** Roundabout has exactly one row (of 149) where
  every App-side column (date, time, direction, vehicle type) is blank
  but every Video-side column is populated. T-junction has exactly one
  such row (of 94). Institutional-idling has zero. In both cases where
  a miss row exists, the pattern is the same: Video side complete,
  App side entirely empty — never the reverse (an App-only row with
  Video blank does not occur in any of the three files).
- **The miss row sits inline, in chronological position, not appended.**
  Roundabout's miss row (Video time 10:39:03) sits between the rows
  timestamped 10:39:01 and 10:39:06 — exactly where it belongs in the
  video's timeline. T-junction's miss row (Video time 16:52:17) sits
  between 16:52:16 and 16:52:18/24, same pattern. Neither is appended
  at the end of its sheet or grouped separately from the matched rows.
- **The Video-side timestamp column is the one that runs unbroken and
  monotonically through the miss row**; the App-side column has the
  gap. This is consistent with the spreadsheet having been built by
  walking the video's event timeline as the reference sequence and
  recording what the app showed (if anything) alongside each video
  event, rather than walking the app's log and separately hunting for
  video events it missed.
- `analysis/recompute_validation.py` and `data/validation/README.md`
  both state explicitly that the pairing was done manually by the
  authors when the spreadsheets were built, and that the script
  computes statistics from the pairing as given rather than re-running
  an independent timestamp-matching algorithm — consistent with, but
  not additional evidence beyond, the row-level pattern above.

No claim is made here about which construction order is correct — only
what the artifacts themselves show. You were present when these were
built; this is offered so your own memory has something concrete to
confirm or correct it against.

---

## C3 — Recorded for you, not decided here

### Inter-rater reliability

**Reopened (30 Aug 2026):** the manuscript previously stated footage
had already been deleted; the author has clarified it is retained
until publication is approved, not yet deleted. A second rating pass
is therefore still possible in principle, on the original footage,
before that point. Recorded as an open item -- whether to actually
arrange a second rater is your call, not attempted here.

### Surveyor consent

Two draft options already exist in `MethodsX_latex/SUBMISSION_NOTES.md`
item 1 (Option A: retrospective consent form; Option B: strengthened
non-participant-argument sentence). Neither has been applied. Still
open.

### Operator training — question list for you, not prose

- Was there a standardized training/briefing given to volunteer
  surveyors before each session, or did each surveyor learn the app
  informally (e.g. a walkthrough by whoever recruited them)?
- If there was a briefing, roughly how long, and did its content differ
  session to session (six sessions, apparently different surveyors
  recruited each time per the Method validation text)?
- Was any surveyor's prior familiarity with the app itself recorded
  (e.g. had operated it before vs. first-time use that session)?
- Is there any written material (a checklist, a one-pager) given to
  surveyors that could be cited, or was it entirely verbal?
- Do you want a training-description paragraph in the manuscript at
  all, or is "recruited volunteer surveyors" (already stated) the
  intended level of detail?

### Figure 3 camera-geometry schematic

No camera height, distance-to-road, or viewing-angle measurements are
recorded anywhere in this repository. If a schematic diagram is wanted
for Figure 3 (or a supplementary figure), those measurements would need
to come from you — nothing here can supply or estimate them.
