"""
blur_figure3_overlay.py -- second redaction pass on the manuscript's Figure 3
field-validation still (already occupant-blurred by blur_figure2.py).

Reviewer/supervisor feedback: the frame has a burned-in camera overlay
stamping the exact date, time, and full road name onto a photo that also
shows a specific residential gate/wall, including a house-number stencil on
the wall face. The manuscript's own prose already states the location (B130
Galle-Wackwella Road) and date (14 July 2026) in Method validation, so the
overlay text adds no information the reader doesn't already have from the
text -- it only adds a persistent, googlable image tying an exact timestamp
to an identifiable residential frontage. Both regions are blurred here as
unnecessary location-sensitive detail.

No unredacted source frame is retained (per the manuscript's own stated
raw-footage deletion policy), so this operates on the already
occupant-redacted image and blurs two additional regions:
  1. the top-right date/time/location overlay text
  2. the house-number stencil visible on the boundary wall

Usage:
    python blur_figure3_overlay.py <input_image> <output_image>
"""

import sys
import cv2


def main():
    if len(sys.argv) != 3:
        print("Usage: python blur_figure3_overlay.py <input_image> <output_image>")
        sys.exit(1)

    src_path, dst_path = sys.argv[1], sys.argv[2]
    img = cv2.imread(src_path)
    if img is None:
        print(f"ERROR: could not read {src_path}")
        sys.exit(1)

    h, w = img.shape[:2]
    print(f"Source image: {w}x{h}")

    # Camera-burned date/time/road-name overlay, top-right corner.
    overlay_box = (1260, 20, 1917, 245)
    # House-number stencil on the boundary wall, left-center.
    housenum_box = (535, 465, 635, 530)

    for (x1, y1, x2, y2) in [overlay_box, housenum_box]:
        x1, y1, x2, y2 = max(0, x1), max(0, y1), min(w, x2), min(h, y2)
        if x2 <= x1 or y2 <= y1:
            continue
        region = img[y1:y2, x1:x2]
        kx = max(41, (x2 - x1) // 2 * 2 + 1)
        ky = max(41, (y2 - y1) // 2 * 2 + 1)
        blurred = cv2.GaussianBlur(region, (kx, ky), 0)
        img[y1:y2, x1:x2] = blurred

    cv2.imwrite(dst_path, img, [cv2.IMWRITE_PNG_COMPRESSION, 3])
    print(f"Wrote redacted image: {dst_path}")


if __name__ == "__main__":
    main()
