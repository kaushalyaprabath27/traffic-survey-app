"""
blur_figure3_occupant.py -- redacts the vehicle occupant (and registration
plate, if visible) in the manuscript's Figure 3 field-validation still, per
the ethics statement's claim that no identifiable person appears in the
published image. (Renamed from blur_figure2.py, which referred to an
earlier figure slot before the manuscript's figures were renumbered; the
old name persisted after Figure 3 took over this content.)

The source frame shows a tuk-tuk in profile at a public roadway; the driver
is visible in silhouette/side-profile. No registration plate is legible in
this particular frame (the plate-typical areas -- front fender, rear panel --
were checked and none is readable at this angle), but the region is blurred
anyway as a precaution in case a higher-resolution source reveals one.

Usage:
    python blur_figure3_occupant.py <input_image> <output_image>

The occupant bounding box below was set by visual inspection of this
specific frame (1917x1078 source) and is NOT a general-purpose face/plate
detector -- if this script is reused on a different frame, the box must be
re-checked by eye first.
"""

import sys
import cv2

def main():
    if len(sys.argv) != 3:
        print("Usage: python blur_figure3_occupant.py <input_image> <output_image>")
        sys.exit(1)

    src_path, dst_path = sys.argv[1], sys.argv[2]
    img = cv2.imread(src_path)
    if img is None:
        print(f"ERROR: could not read {src_path}")
        sys.exit(1)

    h, w = img.shape[:2]
    print(f"Source image: {w}x{h}")

    # Occupant region (driver silhouette), set by visual inspection of this
    # specific frame. Generous margin included on all sides.
    occupant_box = (930, 495, 1075, 700)  # x1, y1, x2, y2

    # Front-fender area, where a registration plate would sit if visible at
    # this angle. Blurred as a precaution even though none was legible.
    plate_box = (990, 640, 1075, 700)

    for (x1, y1, x2, y2) in [occupant_box, plate_box]:
        x1, y1, x2, y2 = max(0, x1), max(0, y1), min(w, x2), min(h, y2)
        if x2 <= x1 or y2 <= y1:
            continue
        region = img[y1:y2, x1:x2]
        # Strong Gaussian blur -- kernel size scaled to region size, odd only
        kx = max(31, (x2 - x1) // 2 * 2 + 1)
        ky = max(31, (y2 - y1) // 2 * 2 + 1)
        blurred = cv2.GaussianBlur(region, (kx, ky), 0)
        img[y1:y2, x1:x2] = blurred

    # Write at the source resolution (1917x1078 at the source DPI already
    # exceeds 300 dpi for the manuscript's printed figure width).
    cv2.imwrite(dst_path, img, [cv2.IMWRITE_PNG_COMPRESSION, 3])
    print(f"Wrote redacted image: {dst_path}")


if __name__ == "__main__":
    main()
