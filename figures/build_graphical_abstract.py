from PIL import Image, ImageDraw, ImageFont

W, H = 600, 1500
BG = (255, 255, 255)
NAVY = (20, 46, 66)
TEAL = (26, 122, 130)
TEAL_LIGHT = (90, 170, 175)
GRAY = (110, 120, 128)

img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)

def font(size, bold=True):
    name = "arialbd.ttf" if bold else "arial.ttf"
    try:
        return ImageFont.truetype(name, size)
    except Exception:
        return ImageFont.load_default()

title_font = font(34)
sub_font = font(15, bold=False)
label_font = font(22)
tag_font = font(13, bold=False)

def center_text(y, text, f, fill=NAVY, max_width=W - 60):
    lines = []
    words = text.split(" ")
    cur = ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textbbox((0, 0), test, font=f)[2] > max_width and cur:
            lines.append(cur)
            cur = w
        else:
            cur = test
    if cur:
        lines.append(cur)
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=f)
        w = bbox[2] - bbox[0]
        draw.text(((W - w) / 2, y), line, font=f, fill=fill)
        y += bbox[3] - bbox[1] + 10
    return y

y = 40
y = center_text(y, "OFFLINE-FIRST", title_font, NAVY)
y = center_text(y, "FIELD DATA CAPTURE", title_font, NAVY)
y += 10
y = center_text(y, "Six survey modules, one shared engine", sub_font, GRAY)
y += 30

box_w, box_h = 320, 130
cx = W // 2
gap = 55

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

def draw_box(top, label, tag, fill=None):
    x0 = cx - box_w // 2
    x1 = cx + box_w // 2
    y0 = top
    y1 = top + box_h
    draw.rounded_rectangle([x0, y0, x1, y1], radius=16, outline=TEAL, width=3, fill=fill)
    bbox = draw.textbbox((0, 0), label, font=label_font)
    lw = bbox[2] - bbox[0]
    draw.text((cx - lw / 2, y0 + 24), label, font=label_font, fill=NAVY)
    if tag:
        tag_lines = wrap(tag, tag_font, box_w - 30)
        ty = y0 + 68
        for tl in tag_lines:
            tbbox = draw.textbbox((0, 0), tl, font=tag_font)
            tw = tbbox[2] - tbbox[0]
            draw.text((cx - tw / 2, ty), tl, font=tag_font, fill=GRAY)
            ty += 20
    return y1

def draw_arrow(y0, y1, measured=True):
    x = cx
    color = TEAL if measured else TEAL_LIGHT
    draw.line([(x, y0), (x, y1 - 14)], fill=color, width=4)
    draw.polygon([(x - 10, y1 - 14), (x + 10, y1 - 14), (x, y1)], fill=color)

stages = [
    ("USER", "surveyor taps one button per event", None),
    ("OFFLINE CAPTURE", "queued in on-device localStorage", None),
    ("BATCH SYNC", "up to 50 events / 15s -- measured 95-97.5% fewer requests", "measured"),
    ("BACKEND", "Apps Script routes to the admin's Sheet", None),
    ("VALIDATION", "227/231 detected on video, 542 observations total", "measured"),
]

top = y
for i, (label, tag, kind) in enumerate(stages):
    bottom = draw_box(top, label, tag)
    if i < len(stages) - 1:
        draw_arrow(bottom, bottom + gap)
    top = bottom + gap

y = top + 20
y = center_text(y, "Batch-sync and validation figures shown above are", tag_font, GRAY)
y = center_text(y, "measured; see Method validation and Table 4 for full results.", tag_font, GRAY)

img.save(r"C:\Users\User\Desktop\PB\graphical_abstract.png", dpi=(300, 300))
print("saved", img.size)
