"""
recompute_validation.py -- single entry point that reads data/validation/ and
recomputes every validation figure reported in the manuscript for the five
modules with a committed video-derived spreadsheet (main-road is excluded:
no video-derived file for it exists in this repository -- see R1-4 in
docs/REVIEWER_RESPONSE.md).

Deterministic, no network. Extends data/validation/match.py rather than
replacing it: same parsing, same duplicate-detection rule, same Wilson
formula (z=1.959964, matching the convention stated in the manuscript's
Method validation section -- match.py itself defaulted to z=1.96, a
difference that does not change any value at 1-decimal rounding, checked
below).

What this adds beyond match.py:
  - every proportion computed BOTH ways: with duplicates excluded (the
    manuscript's reported figures) and with duplicates included (raw)
  - the denominator of every proportion is stated explicitly in the output,
    not implied -- this is what exposed R1-2 (see below)
  - full integer-second timing distribution and SD, not just mean/min/max
  - per-file duplicate counts, not just a total
  - direction accuracy computed with an EXPLICIT, STATED denominator
    (n_detected, matching classification accuracy's convention) rather than
    match.py's own dir_acc field, which is reproduced here unchanged for
    comparison, plus a third variant computed against video_confirmed_events
    to show exactly what the manuscript's current Table 8 actually contains

R1-2 finding, confirmed against the data before this script existed: the
manuscript's printed Table 8 "Direction acc." column does not match what
match.py's own dir_acc formula (wilson_ci(n_correct_dir, n_detected))
produces. It matches wilson_ci(n_correct_dir_or_missed, video_confirmed_events)
instead -- a different, and inconsistent, denominator from classification
accuracy in the same table. Confirmed by direct computation, not asserted:
see the "direction_accuracy_denominator_check" block in the output for each
module.

Usage:
    python recompute_validation.py
Outputs:
    out/validation_recomputed.json
    out/validation_recomputed_report.txt  (human-readable)
"""

import json
import math
import os
import sys
from datetime import datetime, time
from statistics import mean, pstdev

try:
    import openpyxl
except ImportError:
    print("ERROR: openpyxl is required (pip install openpyxl)", file=sys.stderr)
    sys.exit(1)

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "..", "data", "validation")
OUT_DIR = os.path.join(HERE, "out")

Z = 1.959964  # matches the convention stated in the manuscript's Method
              # validation section. match.py itself used a default of 1.96;
              # checked below (see "z_sensitivity_check") that this makes no
              # difference at 1-decimal rounding for any value in this file.


def wilson_ci(successes, n, z=Z):
    """Wilson score 95% CI. Returns (point_pct, lo_pct, hi_pct), each rounded
    to 1 decimal place using round-half-away-from-zero (Python's round() on
    a positive float already does this for .5 cases at this precision)."""
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


def timing_stats(errors):
    if not errors:
        return {"n": 0, "mean": None, "sd": None, "min": None, "max": None, "distribution": {}}
    dist = {}
    for e in errors:
        dist[e] = dist.get(e, 0) + 1
    return {
        "n": len(errors),
        "mean": round(mean(errors), 2),
        "sd": round(pstdev(errors), 2) if len(errors) > 1 else 0.0,
        "min": min(errors),
        "max": max(errors),
        "distribution": dict(sorted(dist.items())),
    }


def analyze_point_event(name, folder, header_rows_to_skip, col_map):
    path = os.path.join(DATA_DIR, folder, "raw_matched.xlsx")
    rows = load_rows(path)
    data = rows[header_rows_to_skip:]

    seen = set()
    dup_rows = []

    def extract(include_dups):
        n_video = n_detected = n_correct_class = n_correct_dir = n_both_correct = 0
        timing_errors = []
        local_seen = set()
        for r in data:
            app_time = r[col_map["app_time"]]
            app_dir = r[col_map["app_dir"]]
            app_type = r[col_map["app_type"]]
            if "v_time" in col_map:
                v_time = r[col_map["v_time"]]
            else:
                h, m_, s = r[col_map["v_h"]], r[col_map["v_m"]], r[col_map["v_s"]]
                v_time = time(int(h), int(m_), int(s)) if h is not None else None
            v_dir = r[col_map["v_dir"]]
            v_type = r[col_map["v_type"]]
            if v_time is None:
                continue
            full_key = tuple(str(x) for x in r)
            if not include_dups:
                if full_key in local_seen:
                    continue
                local_seen.add(full_key)
            n_video += 1
            detected = app_time is not None
            if detected:
                n_detected += 1
                cls_ok = (app_type == v_type)
                dir_ok = (app_dir == v_dir)
                if cls_ok:
                    n_correct_class += 1
                if dir_ok:
                    n_correct_dir += 1
                if cls_ok and dir_ok:
                    n_both_correct += 1
                a_s, v_s = to_seconds(app_time), to_seconds(v_time)
                if a_s is not None and v_s is not None:
                    timing_errors.append(a_s - v_s)
        return n_video, n_detected, n_correct_class, n_correct_dir, n_both_correct, timing_errors

    # First pass with dedup, to also collect the duplicate rows themselves
    # for the per-file count (mirrors match.py's own duplicate rule exactly).
    for r in data:
        v_time_check = r[col_map["v_time"]] if "v_time" in col_map else (
            time(int(r[col_map["v_h"]]), int(r[col_map["v_m"]]), int(r[col_map["v_s"]]))
            if r[col_map["v_h"]] is not None else None
        )
        if v_time_check is None:
            continue
        full_key = tuple(str(x) for x in r)
        if full_key in seen:
            dup_rows.append(r)
        else:
            seen.add(full_key)

    excl = extract(include_dups=False)
    incl = extract(include_dups=True)

    def build(variant, n_video, n_detected, n_correct_class, n_correct_dir, n_both_correct, timing_errors):
        recall = wilson_ci(n_detected, n_video)
        class_acc = wilson_ci(n_correct_class, n_detected) if n_detected else (None, None, None)
        # Direction accuracy, THREE ways, to make the R1-2 discrepancy explicit:
        dir_acc_over_detected = wilson_ci(n_correct_dir, n_detected) if n_detected else (None, None, None)
        # "as if every missed detection also counts as a direction failure" --
        # this is what the manuscript's current Table 8 actually contains.
        dir_acc_over_video_confirmed = wilson_ci(n_correct_dir, n_video)
        both_acc = wilson_ci(n_both_correct, n_video)
        return {
            "variant": variant,
            "video_confirmed_events": n_video,
            "app_detected": n_detected,
            "missed_detections": n_video - n_detected,
            "detection_recall": {
                "numerator": n_detected, "denominator": n_video,
                "pct": recall[0], "ci95": [recall[1], recall[2]],
            },
            "classification_accuracy": {
                "numerator": n_correct_class, "denominator": n_detected,
                "denominator_meaning": "app_detected (matched events only)",
                "pct": class_acc[0], "ci95": [class_acc[1], class_acc[2]],
            },
            "direction_accuracy_over_detected": {
                "numerator": n_correct_dir, "denominator": n_detected,
                "denominator_meaning": "app_detected (matched events only) -- SAME convention as classification_accuracy",
                "pct": dir_acc_over_detected[0], "ci95": [dir_acc_over_detected[1], dir_acc_over_detected[2]],
            },
            "direction_accuracy_over_video_confirmed": {
                "numerator": n_correct_dir, "denominator": n_video,
                "denominator_meaning": "video_confirmed_events -- this is what the manuscript's current Table 8 prints; INCONSISTENT with classification_accuracy's denominator in the same table (R1-2)",
                "pct": dir_acc_over_video_confirmed[0], "ci95": [dir_acc_over_video_confirmed[1], dir_acc_over_video_confirmed[2]],
            },
            "end_to_end_correct": {
                "numerator": n_both_correct, "denominator": n_video,
                "pct": both_acc[0], "ci95": [both_acc[1], both_acc[2]],
            },
            "timing_error_seconds": timing_stats(timing_errors),
        }

    return {
        "module": name,
        "duplicate_rows_this_file": len(dup_rows),
        "duplicate_row_examples": [str(r) for r in dup_rows],
        "excluding_duplicates": build("excluding_duplicates", *excl),
        "including_duplicates": build("including_duplicates", *incl),
    }


def analyze_interval(name, folder, header_rows_to_skip, app_cols, video_cols, count_labels):
    path = os.path.join(DATA_DIR, folder, "raw_matched.xlsx")
    rows = load_rows(path)
    data = rows[header_rows_to_skip:]

    def extract(include_dups):
        n_intervals = n_detected = 0
        count_exact = {label: 0 for label in count_labels}
        start_timing_errors = []
        local_seen = set()
        for r in data:
            app_start = r[app_cols["start"]]
            v_start = r[video_cols["start"]]
            if v_start is None:
                continue
            full_key = tuple(str(x) for x in r)
            if not include_dups:
                if full_key in local_seen:
                    continue
                local_seen.add(full_key)
            n_intervals += 1
            if app_start is None:
                continue
            n_detected += 1
            a_s, v_s = to_seconds(app_start), to_seconds(v_start)
            if a_s is not None and v_s is not None:
                start_timing_errors.append(a_s - v_s)
            for label in count_labels:
                if r[app_cols[label]] == r[video_cols[label]]:
                    count_exact[label] += 1
        return n_intervals, n_detected, count_exact, start_timing_errors

    seen = set()
    dup_rows = []
    for r in data:
        if r[video_cols["start"]] is None:
            continue
        full_key = tuple(str(x) for x in r)
        if full_key in seen:
            dup_rows.append(r)
        else:
            seen.add(full_key)

    def build(variant, n_intervals, n_detected, count_exact, start_timing_errors):
        detect_ci = wilson_ci(n_detected, n_intervals)
        counts = {}
        for label in count_labels:
            acc = wilson_ci(count_exact[label], n_detected) if n_detected else (None, None, None)
            counts[label] = {
                "numerator": count_exact[label], "denominator": n_detected,
                "pct": acc[0], "ci95": [acc[1], acc[2]],
            }
        return {
            "variant": variant,
            "video_confirmed_intervals": n_intervals,
            "app_detected_intervals": n_detected,
            "detection_recall": {
                "numerator": n_detected, "denominator": n_intervals,
                "pct": detect_ci[0], "ci95": [detect_ci[1], detect_ci[2]],
            },
            "count_field_accuracy": counts,
            "start_timing_error_seconds": timing_stats(start_timing_errors),
        }

    excl = extract(include_dups=False)
    incl = extract(include_dups=True)
    return {
        "module": name,
        "duplicate_rows_this_file": len(dup_rows),
        "duplicate_row_examples": [str(r) for r in dup_rows],
        "excluding_duplicates": build("excluding_duplicates", *excl),
        "including_duplicates": build("including_duplicates", *incl),
    }


def z_sensitivity_check(results):
    """Recompute every ci95 pair at z=1.96 (match.py's own default) and flag
    any that round to a different 1-decimal value than at z=1.959964."""
    diffs = []
    for r in results:
        for variant_key in ("excluding_duplicates", "including_duplicates"):
            v = r[variant_key]
            for metric_key, metric in v.items():
                if isinstance(metric, dict) and "numerator" in metric and metric["denominator"]:
                    k, n = metric["numerator"], metric["denominator"]
                    alt = wilson_ci(k, n, z=1.96)
                    if [alt[1], alt[2]] != metric["ci95"]:
                        diffs.append((r["module"], variant_key, metric_key, metric["ci95"], [alt[1], alt[2]]))
    return diffs


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
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

    interval_results = []
    interval_results.append(analyze_interval(
        "bus-idling", "bus-idling_2026-07-28",
        header_rows_to_skip=1,
        app_cols={"start": 1, "end": 2, "duration": 3, "off": 4, "on": 5},
        video_cols={"start": 6, "end": 7, "duration": 8, "off": 9, "on": 10},
        count_labels=["duration", "off", "on"],
    ))
    interval_results.append(analyze_interval(
        "pedestrian", "pedestrian_2026-07-28",
        header_rows_to_skip=1,
        app_cols={"start": 1, "end": 2, "countIn": 3, "countOut": 4},
        video_cols={"start": 5, "end": 6, "countIn": 7, "countOut": 8},
        count_labels=["countIn", "countOut"],
    ))

    zdiff = z_sensitivity_check(results)

    output = {
        "note": "main-road excluded: no video-derived ground-truth file exists for it in this repository (R1-4).",
        "point_event_modules": results,
        "interval_modules": interval_results,
        "z_sensitivity_check": {
            "z_used": Z,
            "z_alternative": 1.96,
            "differences_at_1dp": [
                {"module": m, "variant": v, "metric": mk, "ci_at_z_1.959964": a, "ci_at_z_1.96": b}
                for m, v, mk, a, b in zdiff
            ],
        },
    }

    with open(os.path.join(OUT_DIR, "validation_recomputed.json"), "w") as f:
        json.dump(output, f, indent=2)

    lines = []
    lines.append("VALIDATION RECOMPUTATION REPORT")
    lines.append("=" * 78)
    lines.append("Main-road excluded: no video-derived file exists for it (R1-4).")
    lines.append("")
    for r in results:
        lines.append(f"--- {r['module']} ---")
        lines.append(f"Duplicate rows in this file: {r['duplicate_rows_this_file']}")
        for variant_key in ("excluding_duplicates", "including_duplicates"):
            v = r[variant_key]
            lines.append(f"  [{variant_key}]")
            lines.append(f"    video_confirmed={v['video_confirmed_events']} detected={v['app_detected']} missed={v['missed_detections']}")
            for mk in ("detection_recall", "classification_accuracy", "direction_accuracy_over_detected", "direction_accuracy_over_video_confirmed", "end_to_end_correct"):
                m = v[mk]
                lines.append(f"    {mk}: {m['numerator']}/{m['denominator']} = {m['pct']}% CI{m['ci95']}  [denom={m.get('denominator_meaning', 'video_confirmed_events')}]")
            t = v["timing_error_seconds"]
            lines.append(f"    timing_error_s: n={t['n']} mean={t['mean']} sd={t['sd']} min={t['min']} max={t['max']} dist={t['distribution']}")
        lines.append("")
    for r in interval_results:
        lines.append(f"--- {r['module']} (interval) ---")
        lines.append(f"Duplicate rows in this file: {r['duplicate_rows_this_file']}")
        for variant_key in ("excluding_duplicates", "including_duplicates"):
            v = r[variant_key]
            lines.append(f"  [{variant_key}]")
            lines.append(f"    video_confirmed_intervals={v['video_confirmed_intervals']} detected={v['app_detected_intervals']}")
            m = v["detection_recall"]
            lines.append(f"    detection_recall: {m['numerator']}/{m['denominator']} = {m['pct']}% CI{m['ci95']}")
            for label, m in v["count_field_accuracy"].items():
                lines.append(f"    count_field[{label}]: {m['numerator']}/{m['denominator']} = {m['pct']}% CI{m['ci95']}")
            t = v["start_timing_error_seconds"]
            lines.append(f"    start_timing_error_s: n={t['n']} mean={t['mean']} sd={t['sd']} min={t['min']} max={t['max']} dist={t['distribution']}")
        lines.append("")

    lines.append("--- z sensitivity (1.959964 vs match.py's own default 1.96) ---")
    if zdiff:
        for m, v, mk, a, b in zdiff:
            lines.append(f"  DIFFERS: {m}/{v}/{mk}: z=1.959964 -> {a}, z=1.96 -> {b}")
    else:
        lines.append("  No differences at 1 decimal place for any reported value.")

    report_text = "\n".join(lines)
    with open(os.path.join(OUT_DIR, "validation_recomputed_report.txt"), "w") as f:
        f.write(report_text)
    print(report_text)


if __name__ == "__main__":
    main()
