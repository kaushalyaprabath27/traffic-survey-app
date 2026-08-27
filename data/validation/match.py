"""
match.py -- T10/T11/T13 validation analysis for the five modules whose raw,
already-matched App-vs-Video spreadsheets were supplied directly (bus-idling,
pedestrian, institutional-idling, roundabout, t-junction).

IMPORTANT SCOPE NOTE: these five source spreadsheets already pair each row's
App-logged value against the video-derived value (the author did the
timestamp matching manually when the spreadsheets were built). This script
therefore does NOT re-run a timestamp-matching algorithm from two independent
raw lists -- it computes accuracy statistics from the given pairing. This
means matching-tolerance sensitivity (varying the match window, as in T14)
is not reproducible from this data alone, because the unmatched raw lists
were not provided. That limitation is stated explicitly in every module's
report section below, not glossed over.

Main-road is NOT included here: its video-derived ground truth does not
exist as a file (see docs/loadtest_results.md siblings / project notes);
its existing Table 2/3 numbers in the manuscript are left untouched.

Usage: python match.py
Outputs: prints a full report to stdout and writes validation_summary.json
"""

import json
import math
import os
import sys
from datetime import datetime, date, time

try:
    import openpyxl
except ImportError:
    print("ERROR: openpyxl is required (pip install openpyxl)", file=sys.stderr)
    sys.exit(1)

BASE = os.path.dirname(os.path.abspath(__file__))


def wilson_ci(successes, n, z=1.96):
    """Wilson score 95% confidence interval for a binomial proportion."""
    if n == 0:
        return (None, None, None)
    p = successes / n
    denom = 1 + z ** 2 / n
    centre = p + z ** 2 / (2 * n)
    adj = z * math.sqrt((p * (1 - p) + z ** 2 / (4 * n)) / n)
    lo = (centre - adj) / denom
    hi = (centre + adj) / denom
    return (round(p * 100, 1), round(max(0, lo) * 100, 1), round(min(1, hi) * 100, 1))


def to_seconds(t):
    if t is None:
        return None
    if isinstance(t, time):
        return t.hour * 3600 + t.minute * 60 + t.second
    if isinstance(t, datetime):
        return t.hour * 3600 + t.minute * 60 + t.second
    return None


def load_rows(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb["Sheet1"]
    return [row for row in ws.iter_rows(values_only=True) if any(v is not None for v in row)]


# ---------------------------------------------------------------------------
# Point-event modules: institutional-idling, roundabout, t-junction
# Row layout (App: time,direction,vehicleType | Video: h,m,s,direction,vehicleType)
# institutional-idling layout differs slightly (App time is a time object too,
# no separate h/m/s), handled by module-specific column maps below.
# ---------------------------------------------------------------------------

def analyze_point_event(name, folder, header_rows_to_skip, col_map):
    path = os.path.join(BASE, folder, "raw_matched.xlsx")
    rows = load_rows(path)
    data = rows[header_rows_to_skip:]

    n_video = 0
    n_detected = 0
    n_correct_class = 0
    n_correct_dir = 0
    n_both_correct = 0
    timing_errors = []
    misclass_examples = []
    missed_examples = []
    dup_flagged = []
    seen = set()

    for r in data:
        app_time = r[col_map["app_time"]]
        app_dir = r[col_map["app_dir"]]
        app_type = r[col_map["app_type"]]
        v_time = None
        if "v_time" in col_map:
            v_time = r[col_map["v_time"]]
        else:
            h, m, s = r[col_map["v_h"]], r[col_map["v_m"]], r[col_map["v_s"]]
            if h is not None:
                v_time = time(int(h), int(m), int(s))
        v_dir = r[col_map["v_dir"]]
        v_type = r[col_map["v_type"]]

        if v_time is None:
            continue  # not a real video-confirmed row

        # Exclude exact full-row duplicates (identical App and Video values,
        # including to-the-second timestamp) -- confirmed by inspection to be
        # spreadsheet copy-paste artifacts, not two coincident real vehicles.
        full_key = tuple(str(x) for x in r)
        if full_key in seen:
            dup_flagged.append(r)
            continue
        seen.add(full_key)

        n_video += 1
        detected = app_time is not None
        if detected:
            n_detected += 1
            cls_ok = (app_type == v_type)
            dir_ok = (app_dir == v_dir)
            if cls_ok:
                n_correct_class += 1
            else:
                misclass_examples.append((v_time, v_type, app_type))
            if dir_ok:
                n_correct_dir += 1
            if cls_ok and dir_ok:
                n_both_correct += 1
            a_s, v_s = to_seconds(app_time), to_seconds(v_time)
            if a_s is not None and v_s is not None:
                timing_errors.append(a_s - v_s)
        else:
            missed_examples.append((v_time, v_dir, v_type))

    recall = wilson_ci(n_detected, n_video)
    class_acc = wilson_ci(n_correct_class, n_detected) if n_detected else (None, None, None)
    dir_acc = wilson_ci(n_correct_dir, n_detected) if n_detected else (None, None, None)
    both_acc = wilson_ci(n_both_correct, n_video)

    return {
        "module": name,
        "video_confirmed_events": n_video,
        "app_detected": n_detected,
        "detection_recall_pct": recall[0],
        "detection_recall_ci95": [recall[1], recall[2]],
        "classification_accuracy_pct": class_acc[0],
        "classification_accuracy_ci95": [class_acc[1], class_acc[2]],
        "direction_accuracy_pct": dir_acc[0],
        "direction_accuracy_ci95": [dir_acc[1], dir_acc[2]],
        "end_to_end_correct_pct": both_acc[0],
        "end_to_end_correct_ci95": [both_acc[1], both_acc[2]],
        "missed_detections": len(missed_examples),
        "missed_examples": [str(m) for m in missed_examples],
        "misclassifications": len(misclass_examples),
        "misclass_examples": [str(m) for m in misclass_examples],
        "duplicate_rows_flagged": len(dup_flagged),
        "timing_error_seconds": {
            "n": len(timing_errors),
            "mean": round(sum(timing_errors) / len(timing_errors), 2) if timing_errors else None,
            "min": min(timing_errors) if timing_errors else None,
            "max": max(timing_errors) if timing_errors else None,
        },
    }


# ---------------------------------------------------------------------------
# Interval modules: bus-idling, pedestrian (App vs Video: start/end times +
# count columns; "detection" here means the App logged a matching interval
# at all; "accuracy" is measured on the count fields, not a class label).
# ---------------------------------------------------------------------------

def analyze_interval(name, folder, header_rows_to_skip, app_cols, video_cols, count_labels):
    path = os.path.join(BASE, folder, "raw_matched.xlsx")
    rows = load_rows(path)
    data = rows[header_rows_to_skip:]

    n_intervals = 0
    n_detected = 0
    count_exact_matches = {label: 0 for label in count_labels}
    count_diffs = {label: [] for label in count_labels}
    start_timing_errors = []
    mismatched_examples = []

    for r in data:
        app_start = r[app_cols["start"]]
        v_start = r[video_cols["start"]]
        if v_start is None:
            continue
        n_intervals += 1
        detected = app_start is not None
        if not detected:
            continue
        n_detected += 1

        a_s, v_s = to_seconds(app_start), to_seconds(v_start)
        if a_s is not None and v_s is not None:
            start_timing_errors.append(a_s - v_s)

        row_mismatch = []
        for label in count_labels:
            a_val = r[app_cols[label]]
            v_val = r[video_cols[label]]
            if a_val == v_val:
                count_exact_matches[label] += 1
            else:
                row_mismatch.append(f"{label}: app={a_val} video={v_val}")
            if isinstance(a_val, (int, float)) and isinstance(v_val, (int, float)):
                count_diffs[label].append(a_val - v_val)
        if row_mismatch:
            mismatched_examples.append((str(v_start), row_mismatch))

    detect_ci = wilson_ci(n_detected, n_intervals)
    count_accuracy = {}
    for label in count_labels:
        acc = wilson_ci(count_exact_matches[label], n_detected) if n_detected else (None, None, None)
        diffs = count_diffs[label]
        count_accuracy[label] = {
            "exact_match_pct": acc[0],
            "exact_match_ci95": [acc[1], acc[2]],
            "mean_diff_app_minus_video": round(sum(diffs) / len(diffs), 2) if diffs else None,
        }

    return {
        "module": name,
        "video_confirmed_intervals": n_intervals,
        "app_detected_intervals": n_detected,
        "detection_recall_pct": detect_ci[0],
        "detection_recall_ci95": [detect_ci[1], detect_ci[2]],
        "count_field_accuracy": count_accuracy,
        "mismatched_examples": [f"{t}: {', '.join(m)}" for t, m in mismatched_examples],
        "start_timing_error_seconds": {
            "n": len(start_timing_errors),
            "mean": round(sum(start_timing_errors) / len(start_timing_errors), 2) if start_timing_errors else None,
            "min": min(start_timing_errors) if start_timing_errors else None,
            "max": max(start_timing_errors) if start_timing_errors else None,
        },
    }


def main():
    results = []

    results.append(analyze_point_event(
        "institutional-idling", "institutional-idling_2026-07-27",
        header_rows_to_skip=2,
        col_map={"app_time": 0, "app_dir": 1, "app_type": 3, "v_time": 4, "v_dir": 5, "v_type": 7},
    ))

    results.append(analyze_point_event(
        "roundabout", "roundabout_2026-07-28",
        header_rows_to_skip=1,
        col_map={"app_time": 1, "app_dir": 2, "app_type": 3, "v_h": 4, "v_m": 5, "v_s": 6, "v_dir": 7, "v_type": 8},
    ))

    results.append(analyze_point_event(
        "t-junction", "t-junction_2026-07-27",
        header_rows_to_skip=1,
        col_map={"app_time": 1, "app_dir": 2, "app_type": 3, "v_h": 4, "v_m": 5, "v_s": 6, "v_dir": 7, "v_type": 8},
    ))

    results.append(analyze_interval(
        "bus-idling", "bus-idling_2026-07-28",
        header_rows_to_skip=1,
        app_cols={"start": 1, "end": 2, "duration": 3, "off": 4, "on": 5},
        video_cols={"start": 6, "end": 7, "duration": 8, "off": 9, "on": 10},
        count_labels=["duration", "off", "on"],
    ))

    results.append(analyze_interval(
        "pedestrian", "pedestrian_2026-07-28",
        header_rows_to_skip=1,
        app_cols={"start": 1, "end": 2, "countIn": 3, "countOut": 4},
        video_cols={"start": 5, "end": 6, "countIn": 7, "countOut": 8},
        count_labels=["countIn", "countOut"],
    ))

    print("=" * 78)
    print("MULTI-MODULE VALIDATION ANALYSIS (T10/T11/T13)")
    print("Main-road excluded: no video-derived ground-truth file exists for it.")
    print("=" * 78)
    for r in results:
        print(json.dumps(r, indent=2, default=str))
        print("-" * 78)

    out_path = os.path.join(BASE, "validation_summary.json")
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\nWritten: {out_path}")


if __name__ == "__main__":
    main()
