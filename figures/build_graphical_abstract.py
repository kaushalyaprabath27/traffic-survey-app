from PIL import Image, ImageDraw, ImageFont
import os
import math

# Landscape, left-to-right workflow (per reviewer/supervisor feedback: the
# earlier vertical-stack version read as narrow and text-heavy; a horizontal
# flow is the stronger convention for an Elsevier graphical abstract and
# uses the page's full text width instead of a fraction of it).
W, H = 2600, 650
BG = (255, 255, 255)
NAVY = (20, 46, 66)
TEAL = (26, 122, 130)
TEAL_FILL = (231, 244, 244)
ACCENT = (200, 110, 30)
GRAY = (100, 110, 118)
WHITE = (255, 255, 255)

img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)

def font(size, bold=True):
    name = "arialbd.ttf" if bold else "arial.ttf"
    try:
        return ImageFont.truetype(name, size)
    except Exception:
        return ImageFont.load_default()

title_font = font(46)
sub_font = font(22, bold=False)
label_font = font(21)
tag_font = font(15, bold=False)
novelty_font = font(15, bold=True)
foot_font = font(16, bold=False)

def wrap(text, f, max_width):
    words = text.split(" ")
    lines, cur = [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textbbox((0, 0), test, font=f)[2] > max_width and cur:
            lines.append(cur)
            cur = w
        else:
            cur = test
    if cur:
        lines.append(cur)
    return lines

def center_text(y, text, f, fill=NAVY, max_width=W - 80, cx=None):
    cx = cx if cx is not None else W / 2
    for line in wrap(text, f, max_width):
        bbox = draw.textbbox((0, 0), line, font=f)
        w = bbox[2] - bbox[0]
        draw.text((cx - w / 2, y), line, font=f, fill=fill)
        y += bbox[3] - bbox[1] + 8
    return y

y = 34
y = center_text(y, "OFFLINE-FIRST FIELD DATA CAPTURE", title_font, NAVY)
y += 4
y = center_text(y, "From field taps to validated evidence, on one shared engine", sub_font, GRAY)
y += 30

# ---- pictograms, each centered at (cx, cy) ----

def icon_user(cx, cy):
    draw.ellipse([cx - 14, cy - 34, cx + 14, cy - 6], fill=TEAL)
    draw.pieslice([cx - 26, cy - 4, cx + 26, cy + 48], 180, 360, fill=TEAL)
    draw.ellipse([cx + 6, cy - 30, cx + 30, cy - 6], fill=NAVY)

def icon_modules(cx, cy):
    r = 8
    positions = [(-26, -14), (0, -14), (26, -14), (-26, 14), (0, 14), (26, 14)]
    for dx, dy in positions:
        draw.rounded_rectangle([cx + dx - r, cy + dy - r, cx + dx + r, cy + dy + r], radius=3, fill=TEAL)

def icon_engine(cx, cy):
    draw.ellipse([cx - 12, cy - 12, cx + 12, cy + 12], fill=NAVY)
    for i in range(6):
        a = math.pi * 2 * i / 6
        dx, dy = 34 * math.cos(a), 34 * math.sin(a)
        ex, ey = cx + dx, cy + dy
        draw.line([cx, cy, ex, ey], fill=TEAL, width=3)
        draw.ellipse([ex - 5, ey - 5, ex + 5, ey + 5], fill=TEAL)

def icon_queue(cx, cy):
    bar_w, bar_h, gap_ = 70, 12, 8
    top = cy - (bar_h * 3 + gap_ * 2) / 2
    for i in range(3):
        y0 = top + i * (bar_h + gap_)
        draw.rounded_rectangle([cx - bar_w / 2, y0, cx + bar_w / 2, y0 + bar_h], radius=3, fill=TEAL if i == 0 else NAVY)

def icon_sync(cx, cy):
    r = 28
    draw.arc([cx - r, cy - r, cx + r, cy + r], start=-150, end=120, fill=TEAL, width=7)
    draw.arc([cx - r, cy - r, cx + r, cy + r], start=30, end=300, fill=NAVY, width=7)
    a1 = math.radians(120)
    hx, hy = cx + r * math.cos(a1), cy + r * math.sin(a1)
    draw.polygon([(hx - 14, hy - 5), (hx + 3, hy + 9), (hx - 3, hy - 14)], fill=TEAL)
    a2 = math.radians(-60)
    hx2, hy2 = cx + r * math.cos(a2), cy + r * math.sin(a2)
    draw.polygon([(hx2 + 14, hy2 + 5), (hx2 - 3, hy2 - 9), (hx2 + 3, hy2 + 14)], fill=NAVY)

def icon_backend(cx, cy):
    w_, h_, e = 60, 38, 10
    top = cy - h_ / 2
    draw.ellipse([cx - w_ / 2, top - e, cx + w_ / 2, top + e], fill=TEAL)
    draw.rectangle([cx - w_ / 2, top, cx + w_ / 2, top + h_], fill=TEAL)
    draw.ellipse([cx - w_ / 2, top + h_ - e, cx + w_ / 2, top + h_ + e], fill=NAVY)

def icon_validation(cx, cy):
    r = 30
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=NAVY)
    draw.line([cx - 13, cy, cx - 3, cy + 12], fill=WHITE, width=6)
    draw.line([cx - 3, cy + 12, cx + 16, cy - 12], fill=WHITE, width=6)

# Seven stages, left to right: field users through to validated evidence.
stages = [
    (icon_user, "FIELD USERS", "surveyors tap events\nin real time", None),
    (icon_modules, "6 SURVEY MODULES", "main-road, roundabout, T-junction,\npedestrian, bus-idling, institutional", "one shared engine"),
    (icon_engine, "OFFLINE DATA ENGINE", "single capture/sync core\nfor all six modules", None),
    (icon_queue, "LOCAL QUEUE", "on-device localStorage;\nsurvives closure/power loss", None),
    (icon_sync, "BATCH SYNC", "up to 50 events/15s;\n95-97.5% fewer requests", "measured"),
    (icon_backend, "CLOUD STORAGE", "routed to the admin's\nown Google Sheet", None),
    (icon_validation, "VIDEO VALIDATION", "542 video-confirmed\nobservations; recall >=98.3%", "measured vs. video"),
]

n = len(stages)
margin = 50
arrow_w = 46
box_w = (W - 2 * margin - arrow_w * (n - 1)) / n
box_h = 330
top = y + 10
bottom = top + box_h
box_cy = (top + bottom) / 2

x = margin
for i, (icon_fn, label, tag, novelty) in enumerate(stages):
    x0, x1 = x, x + box_w
    draw.rounded_rectangle([x0, top, x1, bottom], radius=16, fill=TEAL_FILL, outline=TEAL, width=3)
    icon_cy = top + 90
    icon_fn((x0 + x1) / 2, icon_cy)
    ty = icon_cy + 60
    ty = center_text(ty, label, label_font, NAVY, max_width=box_w - 24, cx=(x0 + x1) / 2)
    ty += 6
    for line in tag.split("\n"):
        ty = center_text(ty, line, tag_font, GRAY, max_width=box_w - 20, cx=(x0 + x1) / 2)
    if novelty:
        ty += 6
        ty = center_text(ty, novelty, novelty_font, ACCENT, max_width=box_w - 20, cx=(x0 + x1) / 2)
    if i < n - 1:
        ax0 = x1
        ax1 = x1 + arrow_w
        draw.line([(ax0 + 6, box_cy), (ax1 - 12, box_cy)], fill=TEAL, width=6)
        draw.polygon([(ax1 - 12, box_cy - 12), (ax1 - 12, box_cy + 12), (ax1, box_cy)], fill=TEAL)
    x = x1 + arrow_w

y = bottom + 34
y = center_text(y, "Orange text marks measured evidence, not an illustrative claim -- see Method validation and Table 4.", foot_font, GRAY)

out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "graphical_abstract.png")
img.save(out_path, dpi=(300, 300))
print("saved", out_path, img.size)
