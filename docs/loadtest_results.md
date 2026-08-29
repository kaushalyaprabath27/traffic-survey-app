# Load Test Results (T1)

This document reports the load test that resolves the batching/quota contradiction (defect D-01) between the manuscript's stated batch cap and its previously claimed request counts.

## Method

`tools/loadtest/loadtest.js` simulates concurrent virtual surveyors, each generating one event per second, queuing locally, and flushing to the backend on the same 15-second timer and 50-event batch cap deployed in the app (`main-road/app.js:42` and `main-road/app.js:286`). It targets a real Google Apps Script Web App endpoint using a dedicated, isolated test admin account (`ADM-5505`, registered through the app's own signup/OTP flow specifically for this test, with its own Sheet — no other admin's data was touched). Every HTTP request is logged to a per-request CSV (timestamp, surveyor, batch size, HTTP status, backend-acknowledged count, latency, outcome, raw response body), committed alongside this document in `tools/loadtest/results/`. The backend's own `count` field (the number of rows it wrote to the Sheet for that request) is summed across all successful requests and reported as "events acknowledged" — a true reconciliation, not an assumption that a 200 response means the data landed.

Two scenarios were run, both for a nominal 10 minutes (600s) of tap generation, per T1's spec:

- **Representative**: 6 concurrent surveyors, one per module (main-road, roundabout, t-junction, pedestrian, bus-idling, institutional-idling).
- **Worst case**: 34 concurrent surveyors, all main-road (matching the app's own original stress-test design).

A harness bug was found and fixed before these runs count as valid: the first representative smoke test showed 161 events acknowledged against only 114 generated — more acknowledged than generated, which is only possible if some events were submitted twice. The cause was a race in the harness's shutdown path, where the final drain could resubmit items a still-in-flight regular sync request hadn't yet removed from the queue. This was a bug in the *test harness*, not the application (the application's own queue-removal logic only trims a client-side array after a request's own promise resolves, and the harness's final-flush call was not respecting that). Fixed by making the final flush wait out any in-flight request before proceeding. Re-run confirmed clean reconciliation (114 generated = 114 acknowledged) before the real 600-second runs below.

## Results

### Representative scenario (6 surveyors, 1 per module)

| Metric | Value |
|---|---|
| Events generated | 3,570 |
| Requests sent | **179** |
| Successful requests | 179 (100%) |
| Events acknowledged by backend | 3,570 |
| Shortfall | 0 |
| Avg / median batch size | 19.94 / 15 |
| Min / max batch size | 13 / 30 |
| Avg / median request latency | 13.5s / 13.1s |
| Actual wall-clock duration | 625s (nominal 600s) |

CSV: `tools/loadtest/results/representative_6surv_600s_1787840638407.csv`

The events-generated figure (3,570) matches the manuscript's prior claim exactly. The request count does not: the manuscript claimed 215; measurement gives **179**. The measured average batch size (19.94) is larger than the manuscript's implied average (3,570 / 215 ≈ 16.6). This is consistent with the measured ~13.5s average request latency: because the client only starts a new sync once the previous one resolves, a latency above the nominal 15s interval causes events to accumulate into fewer, larger batches than a naive "one batch every 15s" calculation would predict.

**Why 179, not ~250 (MethodsX revision r2, B3).** A naive estimate of sync opportunities -- 600s / 15s interval x 6 surveyors ~ 240, or using the 625s total duration, 625/15 x 6 = 250 -- overstates the real figure because it assumes every 15-second tick produces a request. It doesn't: `main-road/app.js`'s `syncOfflineQueue()` (and its five per-module duplicates) returns immediately, with no request sent, if a sync is already in flight (`if (isSyncing) return;`) or if the local queue is empty (`if (queue.length === 0) return;`). Neither condition was previously documented in the manuscript's "Offline-first data capture" section as a rate-limiting mechanism in its own right; both are now (MethodsX revision r2). With continuous 1-tap/sec generation the queue is essentially never empty during the 600s generation window, so the in-flight suppression is the operative mechanism here.

Measured directly from the per-request timestamps in the CSV (not estimated), the average gap between one surveyor's consecutive requests, per module:

| Surveyor (module) | Requests | Avg. inter-request gap (s) | Avg. request latency (s) |
|---|---|---|---|
| bus-idling | 35 | 17.20 | 11.65 |
| institutional-idling | 24 | 25.71 | 18.01 |
| main-road | 28 | 21.68 | 15.79 |
| pedestrian | 37 | 16.25 | 8.57 |
| roundabout | 24 | 25.56 | 16.55 |
| t-junction | 31 | 19.49 | 13.59 |

The gap tracks the latency: modules with higher average request latency show proportionally longer inter-request gaps, all longer than the nominal 15s. Summing `600s / avg_gap` across the six rows above gives ~177 requests, matching the observed 179 (the small residual is startup/drain edge effects not captured by a flat per-surveyor average). This is the actual mechanism, read directly off the logs, not a hypothesis fitted to the total afterward.

### Worst-case scenario (34 surveyors, all main-road)

| Metric | Value |
|---|---|
| Events generated | 20,230 |
| Requests sent | **498** |
| Successful requests | 452 |
| Failed requests | 46 (rate-limit rejections; see below) |
| Events acknowledged by backend | 20,230 |
| Shortfall | **0** |
| Avg / median batch size | 45.24 / 50 (cap) |
| Min / max batch size | 14 / 50 |
| Avg / median request latency | 108.0s / 118.7s |
| Max request latency | 140.0s |
| Actual wall-clock duration | **1,718s (~28.6 min)**, nominal 600s |

CSV: `tools/loadtest/results/worstcase_34surv_600s_1787841370225.csv`

**This resolves D-01.** The events-generated figure (20,230) matches the manuscript's prior claim exactly. The manuscript's prior request-count claim, 283, is mathematically impossible under the deployed 50-event batch cap: 283 × 50 = 14,150, which is 6,080 short of 20,230 — the exact shape of the contradiction the work order flagged. Measurement gives **498** requests, with a median batch size at the cap (50), which is internally consistent (498 × ~40.6 avg ≈ 20,230). The prior "283 requests, avg batch 43.81" figures already in `TECHNICAL_DOCUMENTATION.md` were themselves internally inconsistent (43.81 × 283 = 12,398 ≠ 20,230) before this measurement — they could not have come from an actual run of this harness against this backend as currently configured, and are best treated as an estimate or a stale figure from before the backend's admin-ID validation and rate limiting were added, not a reproducible measurement.

**No data was permanently lost.** Reconciliation is exact: all 20,230 generated events were eventually acknowledged by the backend, and rows written match events generated with zero shortfall. But this took nearly 3x the nominal test duration to achieve, and 46 requests (9.2%) failed outright with `"Global rate limit exceeded (Too Many Requests)"` — the backend's own global cap of 300 requests/minute, shared across all admins on this deployment (`backend/master_apps_script.js:483`). Failed batches remained queued client-side and were retried on the next sync cycle, which is why final reconciliation is clean despite the failures. Average request latency degraded roughly 8x under this load (108s vs. ~13.5s in the six-surveyor scenario), which is itself a compounding factor: slower responses mean the client can flush less often, so unflushed events pile up faster than the surviving request throughput can drain them, which is consistent with the near-3x elapsed-time-to-drain observed here.

**Two different "average batch size" figures appear for this scenario and they are not a contradiction (MethodsX revision r2, B3).** This document's own summary above reports **45.24** (mean of the `batch_size` field logged on all 498 request *attempts*, including the 46 that failed — each of those attempted the full 50-event cap, since rate-limit rejections happen precisely when the largest, most rate-limit-visible batches go out). The manuscript's Table 4 "Events/req." column instead reports **40.62** = 20,230 successful events / 498 total requests *sent* — dividing net delivered events by every attempt, including the 46 that delivered zero net new events (their 50-event payload was successfully resent, and counted, in a later request). Both are correct measurements of different things; 40.62 is diluted below the 50-event median by the 46 zero-yield attempts without those attempts changing the size distribution of batches that actually succeeded. Confirmed directly from `worstcase_34surv_600s_1787841370225.csv`: mean batch size across the 452 *successful* requests alone is 44.76, close to but not identical to the summary's 45.24 (which additionally includes the 46 failed attempts' logged size of 50 each).

**Methodological caveat.** This 108s average latency and 28.6-minute drain time reflect one virtual harness running 34 concurrent `fetch()` calls from a single Node.js process against one endpoint. It has not been isolated from Node's own HTTP client connection-pooling behavior — if Node's default per-origin connection concurrency is more limited than 34, part of the observed latency could reflect client-side queuing rather than the Apps Script backend's own processing time. This is flagged rather than asserted as a pure backend-capacity finding; separating the two would require either a client known to use unbounded per-origin concurrency, or 34 independent client processes/machines. What is not in question, because it is directly server-reported, is the rate-limit rejection behavior and the eventual-consistency result (zero shortfall after retries).

## Reconciliation summary (T1 acceptance criterion)

| Scenario | Events generated | Events acknowledged | Shortfall |
|---|---|---|---|
| Representative | 3,570 | 3,570 | 0 |
| Worst case | 20,230 | 20,230 | 0 |

Events generated, events acknowledged, and rows written all reconcile exactly in both scenarios. The manuscript's batch cap (50) and polling interval (15s) claims match the deployed constants exactly (`main-road/app.js:42`, `main-road/app.js:286`). The manuscript's *request-count* claims do not match measurement and should be corrected to 179 (representative) and 498 (worst case), with the worst-case scenario's actual drain time (~28.6 minutes, not 10) and its 46 rate-limit failures reported alongside — both are real, load-bearing findings, not incidental detail.
