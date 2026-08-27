# Changelog

Format loosely follows [Keep a Changelog](https://keepachangelog.com/). Dates and commit hashes are taken directly from git history, not reconstructed from memory.

## Note on the v1.0.0 tag

The `v1.0.0` git tag points to commit `3dafbde` (2026-07-25 19:54 +0530). Two further commits — both same-day — and one the following day were made *after* that tag and are not included in it: the backend rate-limiting work (`225b4d6`, `3976c5f`, 2026-07-25 20:33–20:38) and the self-hosted app icons (`0f02fc5`, 2026-07-26). The GitHub Release for `v1.0.0` (published 2026-07-25 14:47 UTC) describes the suite generally and does not specifically claim the rate-limiting behavior. This is stated plainly rather than left implicit: any description of "v1.0.0" that includes the rate limiter is describing the tip of `main` as of 2026-07-26, not the exact tagged commit. Whether to move the tag forward, or cut a `v1.0.1`, is an author decision.

## [Unreleased]

### Added
- `tools/loadtest/loadtest.js` — instrumented load-test harness with per-request CSV logging and backend-acknowledgement reconciliation (`docs/loadtest_results.md`).
- `data/validation/` — video-derived validation dataset and `match.py` analysis for institutional-idling, roundabout, t-junction, bus-idling, and pedestrian (`docs/validation_multimodule_results.md`).
- `docs/DEPLOYMENT.md`, `docs/DATA_SCHEMA.md` — deployment and data-schema documentation.
- Security model and threat scope subsection in `TECHNICAL_DOCUMENTATION.md` Section 7 (plaintext password storage, OTP attempt-limit gap, Admin ID brute-force timing — disclosed, not yet fixed).

### Fixed
- `TECHNICAL_DOCUMENTATION.md` Section 5D's load-test request counts (215/283), which were internally inconsistent with the events-logged figures reported alongside them and unreproducible against the deployed backend, replaced with measured figures (179/498) and the worst-case scenario's actual 28.6-minute drain time.

## [v1.0.0] — 2026-07-25 (tag at `3dafbde`; see note above)

Initial public release. Six survey modules (main-road, roundabout, t-junction, pedestrian, bus-idling, institutional-idling) sharing one offline-first, batch-synchronizing data-capture engine. Main-road independently validated against synchronized video from a real field session: 98.3% detection recall, 98.7% precision, 98.7% classification accuracy (231 video-confirmed vehicles). Frontend PWA and Google Apps Script backend both included.

### Commits after the tag, same release cycle
- `225b4d6` (2026-07-25 20:33) — Backend rate limiting and brute-force protection.
- `3976c5f` (2026-07-25 20:38) — Global rate limit across all incoming requests.
- `0f02fc5` (2026-07-26 10:40) — Self-hosted app icons and iOS install support.

### Earlier history (pre-tag)
- `d93afae` (2026-07-25 19:50) — Support external `config.js` for the Apps Script URL.
- `d7bb606` — Initial commit for public release.
