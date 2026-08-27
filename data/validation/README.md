# Multi-module validation dataset (T10)

This directory holds the video-derived validation evidence for five of the six survey modules: `institutional-idling`, `roundabout`, `t-junction`, `bus-idling`, and `pedestrian`. Each module's folder is named for its actual survey date, and contains `raw_matched.xlsx` -- the original spreadsheet in which each row already pairs the application's logged value against the value derived from reviewing the field video, produced by the authors.

**Main-road is not included here.** Its video-derived ground truth does not exist as a file; the manuscript's existing Table 2/3 (231 video-confirmed vehicles, from the July 14 session) is left untouched by this addition.

## Survey dates and scale

| Module | Date | Video-confirmed events (after dedup) |
|---|---|---|
| institutional-idling | 2026-07-27 | 37 |
| t-junction | 2026-07-27 | 92 |
| roundabout | 2026-07-28 | 148 |
| bus-idling | 2026-07-28 | 11 intervals |
| pedestrian | 2026-07-28 | 23 intervals |

## Running the analysis

```
python match.py
```

Reads all five `raw_matched.xlsx` files, computes detection recall, classification accuracy, direction accuracy, and timing error (with Wilson 95% confidence intervals) for the three point-event modules, and detection recall plus count-field accuracy for the two interval modules. Writes `validation_summary.json` and prints the same to stdout.

## Important scope note

The five source spreadsheets already pair each row's app-logged value against its video-derived value -- the timestamp matching was done manually by the authors when the spreadsheets were built. `match.py` therefore computes accuracy statistics from that existing pairing; it does **not** re-run an independent timestamp-matching algorithm from two separate raw lists. This means matching-tolerance sensitivity (re-matching at 1s/2s/3s/5s windows, as done for Main Road) is not reproducible from this data alone, because the unmatched raw per-source lists were not provided -- only the already-paired result. This is a real limitation of this dataset, not glossed over.

## Data-quality finding: duplicate rows

Seven rows across three files are **exact full-row duplicates** of the immediately preceding row -- identical on both the App and Video sides, including the video timestamp to the second (2 in institutional-idling, 2 in roundabout, 3 in t-junction). This is almost certainly a spreadsheet copy-paste artifact from when the sheets were compiled, not seven genuinely coincident vehicles of the same type, direction, and exact same second. `match.py` excludes these from all denominators; the counts in this README and in `validation_summary.json` are post-deduplication. The raw `.xlsx` files are left unmodified (duplicates still present in the original), so anyone re-checking against the source will see the discrepancy explained here rather than silently corrected.
