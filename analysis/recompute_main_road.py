"""
recompute_main_road.py -- computes every main-road validation figure
reported in the manuscript from the newly re-analyzed, complete video
matched table (data/validation/main-road_2026-07-14/raw_matched.xlsx).

The previous main-road figures (231/230/227, mean timing 0.37s, etc.)
came from a per-vehicle matched table that was never retained as a
committed file (Limitations, prior text) -- the author has now
re-analyzed the full source video and supplied a new, complete matched
table covering both directions of the road (columns: Date, App Time,
App Direction, App Vehicle Type, Video Time, Video Direction, Video
Vehicle Type). This script recomputes every figure from that file,
using the exact same Wilson-CI and rounding convention as
recompute_validation.py (z=1.959964, round-half-away-from-zero, 1
decimal place), so all modules' figures are computed consistently.

Deterministic, no network. Nothing here estimates or back-fills a
number -- every value is read directly from the committed spreadsheet.
"""
import json
import math
import os
from collections import Counter, defaultdict
from datetime import time, datetime

import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(HERE, "..", "data", "validation", "main-road_2026-07-14", "raw_matched.xlsx")
OUT_DIR = os.path.join(HERE, "out")
os.makedirs(OUT_DIR, exist_ok=True)

Z = 1.959964


def wilson_ci(successes, n, z=Z):
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
    if isinstance(t, (time, datetime)):
        return t.hour * 3600 + t.minute * 60 + t.second
    return None


wb = openpyxl.load_workbook(DATA_PATH, read_only=True, data_only=True)
ws = wb.active
rows = list(ws.iter_rows(min_row=2, values_only=True))
wb.close()

records = []
for r in rows:
    date, app_t, app_dir, app_vt, video_t, video_dir, video_vt = r[0], r[1], r[2], r[3], r[4], r[5], r[6]
    if app_t is None and video_t is None:
        continue  # trailing blank row
    records.append({
        "date": date, "app_time": app_t, "app_dir": app_dir, "app_vt": app_vt,
        "video_time": video_t, "video_dir": video_dir, "video_vt": video_vt,
    })

video_confirmed = [r for r in records if r["video_time"] is not None]
app_side_present = [r for r in records if r["app_time"] is not None]
matched = [r for r in records if r["app_time"] is not None and r["video_time"] is not None]
misses = [r for r in records if r["app_time"] is None and r["video_time"] is not None]
extras = [r for r in records if r["app_time"] is not None and r["video_time"] is None]

n_video_confirmed = len(video_confirmed)
n_app_total = len(app_side_present)
n_matched = len(matched)
n_misses = len(misses)
n_extras = len(extras)

class_correct = [r for r in matched if r["app_vt"] == r["video_vt"]]
class_mismatches = [r for r in matched if r["app_vt"] != r["video_vt"]]
n_class_correct = len(class_correct)

detection_recall = wilson_ci(n_matched, n_video_confirmed)
detection_precision = wilson_ci(n_matched, n_app_total)
classification_accuracy = wilson_ci(n_class_correct, n_matched)
both_correct = wilson_ci(n_class_correct, n_video_confirmed)  # detected AND correctly classified, over video-confirmed

# timing offsets (app - video), matched pairs, seconds (integer)
diffs = []
for r in matched:
    a = to_seconds(r["app_time"])
    v = to_seconds(r["video_time"])
    diffs.append(a - v)
abs_diffs = [abs(d) for d in diffs]
mean_diff = sum(diffs) / len(diffs)
mean_abs_diff = sum(abs_diffs) / len(abs_diffs)
sd_diff = math.sqrt(sum((d - mean_diff) ** 2 for d in diffs) / len(diffs))
within1 = sum(1 for d in abs_diffs if d <= 1) / len(abs_diffs) * 100
within2 = sum(1 for d in abs_diffs if d <= 2) / len(abs_diffs) * 100
diff_dist = dict(sorted(Counter(diffs).items()))
abs_diff_dist = dict(sorted(Counter(abs_diffs).items()))

# per-class breakdown (video-confirmed vehicle type -> recall/class accuracy)
classes = sorted(set(r["video_vt"] for r in video_confirmed if r["video_vt"]))
per_class = {}
for c in classes:
    conf = [r for r in video_confirmed if r["video_vt"] == c]
    det = [r for r in matched if r["video_vt"] == c]
    correct = [r for r in det if r["app_vt"] == r["video_vt"]]
    per_class[c] = {
        "n_video_confirmed": len(conf),
        "n_detected": len(det),
        "n_correct": len(correct),
        "recall": wilson_ci(len(det), len(conf)),
        "classification_accuracy": wilson_ci(len(correct), len(det)) if len(det) else (None, None, None),
    }

# direction breakdown (bonus -- not previously reported, now derivable)
directions = sorted(set(r["video_dir"] for r in video_confirmed if r["video_dir"]))
per_direction = {}
for d in directions:
    conf = [r for r in video_confirmed if r["video_dir"] == d]
    det = [r for r in matched if r["video_dir"] == d]
    per_direction[d] = {"n_video_confirmed": len(conf), "n_detected": len(det)}

# discrepancy list: misses + misclassifications (matches manuscript's Table 6 definition)
discrepancies = []
for r in misses:
    discrepancies.append({
        "type": "miss", "video_time": str(r["video_time"]), "video_dir": r["video_dir"],
        "video_vt": r["video_vt"], "app_time": None, "app_vt": None,
    })
for r in class_mismatches:
    discrepancies.append({
        "type": "misclassification", "video_time": str(r["video_time"]), "video_dir": r["video_dir"],
        "video_vt": r["video_vt"], "app_time": str(r["app_time"]), "app_vt": r["app_vt"],
    })
discrepancies.sort(key=lambda d: d["video_time"])

result = {
    "source_file": "data/validation/main-road_2026-07-14/raw_matched.xlsx",
    "n_records_total": len(records),
    "n_video_confirmed": n_video_confirmed,
    "n_app_total": n_app_total,
    "n_matched": n_matched,
    "n_misses": n_misses,
    "n_extras": n_extras,
    "n_class_correct": n_class_correct,
    "n_class_mismatches": len(class_mismatches),
    "detection_recall_pct_ci": detection_recall,
    "detection_precision_pct_ci": detection_precision,
    "classification_accuracy_pct_ci": classification_accuracy,
    "detected_and_correctly_classified_pct_ci": both_correct,
    "timing": {
        "n": len(diffs),
        "mean_signed": round(mean_diff, 3),
        "mean_abs": round(mean_abs_diff, 3),
        "sd_signed": round(sd_diff, 3),
        "within_1s_pct": round(within1, 1),
        "within_2s_pct": round(within2, 1),
        "signed_diff_distribution": diff_dist,
        "abs_diff_distribution": abs_diff_dist,
    },
    "per_class": per_class,
    "per_direction": per_direction,
    "discrepancies": discrepancies,
    "n_discrepancies": len(discrepancies),
}

with open(os.path.join(OUT_DIR, "main_road_recomputed.json"), "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2, default=str)

print(json.dumps(result, indent=2, default=str))
