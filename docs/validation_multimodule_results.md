# Multi-Module Validation Results (T10/T11/T13)

Full method, data, and analysis script: `data/validation/` (see its README for the scope note on matching-tolerance limitations and the duplicate-row data-quality finding).

This extends the manuscript's existing single-module validation (Main Road, 231 video-confirmed vehicles, Table 2/3) with independent video-derived validation for the other five modules, using spreadsheets in which the authors had already paired each app-logged event against its video-derived value.

## Point-event modules (detection, classification, direction, timing)

| Module | N (video-confirmed) | Detection recall | Classification accuracy | Direction accuracy | End-to-end correct | Timing error (mean, range) |
|---|---|---|---|---|---|---|
| institutional-idling | 37 | 100% [90.6, 100] | 97.3% [86.2, 99.5] | 100% [90.6, 100] | 97.3% [86.2, 99.5] | −0.05s (−2 to +1s) |
| roundabout | 148 | 99.3% [96.3, 99.9] | 100% [97.5, 100] | 99.3% [96.3, 99.9] | 98.6% [95.2, 99.6] | −0.44s (−4 to +3s) |
| t-junction | 92 | 98.9% [94.1, 99.8] | 100% [95.9, 100] | 98.9% [94.1, 99.8] | 97.8% [92.4, 99.4] | +0.21s (−6 to +6s) |

All confidence intervals are Wilson 95%.

### Session time windows

| Module | Date | Time window |
|---|---|---|
| t-junction | 27 July 2026 | 16:51:09--16:58:07 |
| institutional-idling | 27 July 2026 | 17:10:49--17:26:46 |
| roundabout | 28 July 2026 | 10:38:48--10:48:47 |
| bus-idling | 28 July 2026 | 11:07:48--11:37:53 |
| pedestrian | 28 July 2026 | 11:39:29--11:52:39 |

Precise site addresses and the number of surveyors involved in each of these five sessions were not recorded to the same level of detail as the 14 July main-road session; this is named as a limitation in the manuscript rather than reconstructed.

**Missed detections (1 each, roundabout and t-junction):** a Tuk Tuk at 10:39:03 (roundabout) and a Car at 16:52:17 (t-junction) were visible in the video but never logged by the app.

**Misclassification (1, institutional-idling):** a vehicle at 17:15:20 was logged by the app as "Van" but the video shows "Truck."

## Interval modules (detection, count-field accuracy)

| Module | N (video-confirmed intervals) | Detection recall | Count fields matching exactly | Start-time error (mean, range) |
|---|---|---|---|---|
| bus-idling | 11 | 100% [74.1, 100] | duration 100%, off-count 100%, on-count 90.9% [62.3, 98.4] | +0.09s (−2 to +2s) |
| pedestrian | 23 | 100% [85.7, 100] | countIn 100%, countOut 100% | +0.13s (−3 to +3s) |

**Count mismatch (1, bus-idling):** the 11:14:45 interval's "got on" count was logged as 6 by the app against 5 confirmed in the video.

## What this adds to the manuscript's validation claim

Combined with the existing Main Road validation (231 vehicles), the suite now has independent video-derived validation evidence across all six modules, totaling 542 video-confirmed observations (231 + 37 + 148 + 92 + 11 + 23). Detection recall is at or above 98.9% in every point-event module, and classification accuracy is at or above 97.3% — consistent with, not contradicting, the Main Road result, and a materially stronger evidentiary base than a single-module claim.

## Data-quality finding, reported plainly

Seven rows across three of the five source spreadsheets were exact full-row duplicates (see `data/validation/README.md`), almost certainly a copy-paste artifact rather than seven real coincident vehicles. These are excluded from every count and percentage above. This is disclosed rather than silently corrected: the original spreadsheets still contain the duplicate rows.
