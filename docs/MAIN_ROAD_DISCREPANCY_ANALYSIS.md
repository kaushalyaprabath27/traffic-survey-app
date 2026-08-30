# Main-Road Discrepancy Analysis

This document gives the full per-discrepancy detail behind the manuscript's
Method validation summary for the main-road session (14 July 2026), moved
here to keep the manuscript body at a method-summary level of detail rather
than a per-timestamp forensic audit.

**Superseded (30 Aug 2026):** this document previously covered ten
discrepancies (four missed, three misclassified, three unmatched) drawn
from a per-vehicle matched table that was not retained as a committed
file. The author has since supplied a full re-analysis of the source
video (`data/validation/main-road_2026-07-14/raw_matched.xlsx`,
computed by `analysis/recompute_main_road.py`), which the manuscript
now reports from directly. That table has zero unmatched entries (every
application-logged vehicle matched a video-confirmed one) and five
discrepancies in total. Everything below reflects the current, committed
data.

## Are the five discrepancies clustered in time?

Binning all five discrepancies (four missed, one misclassified) into
consecutive five-minute windows across the 30-minute-14-second session
(13:32:22–14:02:36; the final window is 5 minutes 14 seconds, the other
five are 5 minutes each):

| Window | Discrepancies |
|---|---|
| 13:32:22–13:37:22 | 3 |
| 13:37:22–13:42:22 | 1 |
| 13:42:22–13:47:22 | 1 |
| 13:47:22–13:52:22 | 0 |
| 13:52:22–13:57:22 | 0 |
| 13:57:22–14:02:36 | 0 |

Every discrepancy falls between 13:34:33 and 13:44:04 — the first third
of the session — with none in the second half. Five events are too few
to distinguish any genuine within-session pattern from chance
clustering, so no interpretation is drawn from this distribution; it is
reported here so a reader checking the discrepancy timestamps does not
have to derive it themselves.

## Discrepancy detail

| Type | App recorded | Video shows | Time | Direction |
|---|---|---|---|---|
| Missed detection | — | Bike | 13:34:33 | Galle |
| Missed detection | — | Car | 13:34:38 | Galle |
| Missed detection | — | Bike | 13:36:20 | Wakwella |
| Misclassification | Tuk-tuk | Car | 13:38:21 | Galle |
| Missed detection | — | Bike | 13:44:04 | Wakwella |

## Misclassification pattern

The single misclassification involved a smaller, less visually distinct
class (a three-wheeler) confused with a similarly sized but different one
(a car), consistent with the literature's general finding that
classification error is driven primarily by difficulty recognizing a
vehicle's length or form, not by missing it altogether [6]. With only
one misclassification in this dataset, no broader pattern claim is drawn
beyond this single instance.

## No unmatched entries in this dataset

Unlike the earlier, unretained matched table, this dataset has zero
application-logged entries without a video match (checked directly:
`analysis/recompute_main_road.py`'s `n_extras` field is 0). There is
consequently no tolerance-sensitivity question to resolve about
ambiguous unmatched entries, and no "alternative reading" of the
headline recall/accuracy figures is needed.
