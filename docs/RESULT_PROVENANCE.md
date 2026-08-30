# Result provenance: what code/backend state each reported result came from

MethodsX revision r2, B4. Recommended as **supplementary material**, not
inline in Method details — the manuscript already states each result's
date at the point it is reported (Study setup, Table 4's surrounding
text, Security model), and a full commit-SHA-level table adds detail a
MethodsX reader does not need in the main text but a reviewer or future
maintainer might. One sentence pointing here has been added to Resource
availability.

| Result | Date obtained | Commit SHA | Backend deployment state at the time |
|---|---|---|---|
| Main-road validation (Tables 4, 5, 6; 448 video-confirmed vehicles) | 14 Jul 2026 (field session); full re-analysis and matched table supplied 30 Aug 2026 | `data/validation/main-road_2026-07-14/raw_matched.xlsx`, committed on the `methodsx-revision-r2` branch; recomputed by `analysis/recompute_main_road.py` | Not backend-dependent — this is an offline video-vs-app timestamp comparison, not a live-backend measurement |
| Five-module validation (Tables 8, 9; institutional-idling, roundabout, t-junction, bus-idling, pedestrian) | 27-28 Jul 2026 (field sessions) | `1d9ea5c` (raw per-module spreadsheets and match methodology committed, 27 Aug 2026); `analysis/recompute_validation.py` (recomputation, `5495499`/`39fda0d`) | Not backend-dependent — same offline comparison method as main-road |
| Table 4, representative scenario (6 surveyors) | 27 Aug 2026, ~14:24-14:34 (session timestamps in the raw CSV) | `ecaf562` ("T1: resolve batching/quota reconciliation (D-01)") | **Pre**-password-hashing, **pre**-idempotency-dedup. The dedup code was committed later the same day (`bb9f237`, 23:31) and deployed live the next day (28 Aug) — this load test ran entirely before either fix existed on the backend |
| Table 4, worst-case scenario (34 surveyors) | 27 Aug 2026 (same session as above) | `ecaf562` | Same pre-fix state as the representative scenario |
| Password migration (12 rows hashed) | 28 Aug 2026 | `bb9f237` (code); `a694844` ("Reconcile backend script with live production") | Deployed live 28 Aug 2026; `migrateHashPasswords()` run once from the Apps Script editor same day |
| Idempotency/dedup confirmation (`count=0, duplicatesSkipped=1` on retry) | 28 Aug 2026, post-deployment | `bb9f237` | Deployed live 28 Aug 2026 |
| B1: Admin ID widened to 12 characters | 29 Aug 2026 (this revision round) | Committed this round (`methodsx-revision-r2` branch) | **Not deployed to the live backend.** Code-only change in the repository; the 12 already-issued 4-digit IDs are unmigrated pending author approval (`docs/ADMIN_ID_MIGRATION_PROPOSAL.md`) |
| B1: `ADM-5505` rotated to `ADM-7734` | 29 Aug 2026 | N/A — a direct registry-spreadsheet edit, not a code change | Live, confirmed via two `registry_info` reads before/after (REVISION_CHANGELOG.md, Part 0) |
| B2: Storage-full failure handling fix | 29 Aug 2026 (this revision round) | Committed this round (`methodsx-revision-r2` branch) | **Not deployed anywhere** — this is a static frontend file change; it ships whenever the frontend is next deployed (GitHub Pages/Netlify/Vercel per the repository's own deployment instructions), which has not been done as part of this revision |

## Would re-running the load test after the dedup fix change the request count or drain time?

**No change expected, and it has not been re-run.** Reasoned from what
the dedup fix actually does and what the original logs actually
contain, not assumed:

- The dedup fix (`eventId`-based, `CacheService`-backed) only changes
  behavior in one specific scenario: the backend successfully writes a
  batch, but the client never receives (or errors out on) the
  acknowledgment, and later retries the same batch. Only that retry
  would now be silently rejected server-side instead of writing a
  duplicate row.
- Checked directly against both CSVs (`tools/loadtest/results/*.csv`):
  every logged outcome is either `success` or `app_error` (a clean,
  explicit rate-limit rejection that never reached the sheet-write
  step at all). **Neither log contains an instance of the specific
  scenario the dedup fix addresses** — no request timed out or errored
  after a successful write in either run.
- The fix touches only the backend's write-path deduplication logic.
  It does not touch the sync timer, the `isSyncing` in-flight guard,
  the batch-size cap, or anything else that determines request count
  or drain time (Method details, "Offline-first data capture", above).

So under the *same* network conditions as the original runs, a re-run
would be expected to reproduce materially the same request count and
drain time — the dedup fix has no code path that would fire, since the
failure mode it protects against didn't occur in the original data.
This conclusion would not necessarily hold under a *different* run
with genuine network-level acknowledgment loss (not just server-side
rate-limit rejection), which is a real possibility the original test
didn't happen to hit. **Not re-run against the live backend as part of
this revision** — that would require the author's go-ahead, per the
task's own instruction not to run further load tests against
production without asking first.
