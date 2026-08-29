from PIL import Image, ImageDraw, ImageFont
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(HERE, "module_screenshots")
OUT_PATH = os.path.join(HERE, "figure1_module_composite.png")

modules = [
    ("main-road", "Main Road"),
    ("roundabout", "Roundabout"),
    ("t-junction", "T-Junction"),
    ("pedestrian", "Pedestrian"),
    ("bus-idling", "Bus Idling"),
    ("institutional-idling", "Institutional Idling"),
]

# 2x3 grid (2 rows, 3 columns): the earlier single-row layout (six cells
# wide) is unreadable at MethodsX print column width -- each phone
# screenshot shrinks too far. A 2x3 grid halves the number of columns,
# roughly doubling each cell's printed width for the same page width.
# Cell size is 3x the original per-cell size (380x620 -> 1140x1860) to
# match the screenshots' own 3x device_scale_factor capture
# (take_screenshots.py), giving real pixel detail rather than upsampled
# interpolation, so the composite can be tagged at 500 dpi honestly.
CELL_W, CELL_H = 1140, 1860
LABEL_H = 150
PAD = 42

try:
    font = ImageFont.truetype("arialbd.ttf", 78)
except Exception:
    font = ImageFont.load_default()

cells = []
for slug, label in modules:
    img = Image.open(os.path.join(SRC_DIR, f"{slug}.png")).convert("RGB")
    scale = CELL_W / img.width
    new_h = int(img.height * scale)
    img = img.resize((CELL_W, new_h), Image.LANCZOS)
    if new_h > CELL_H:
        img = img.crop((0, 0, CELL_W, CELL_H))
    else:
        canvas = Image.new("RGB", (CELL_W, CELL_H), (10, 10, 20))
        canvas.paste(img, (0, 0))
        img = canvas
    cells.append((img, label))

cols, rows = 3, 2
total_w = cols * CELL_W + (cols + 1) * PAD
total_h = rows * (CELL_H + LABEL_H) + (rows + 1) * PAD

composite = Image.new("RGB", (total_w, total_h), (255, 255, 255))
draw = ImageDraw.Draw(composite)

for i, (img, label) in enumerate(cells):
    col = i % cols
    row = i // cols
    x = PAD + col * (CELL_W + PAD)
    y = PAD + row * (CELL_H + LABEL_H + PAD)
    composite.paste(img, (x, y))
    draw.rectangle([x, y, x + CELL_W - 1, y + CELL_H - 1], outline=(0, 0, 0), width=6)
    text_y = y + CELL_H + 8
    bbox = draw.textbbox((0, 0), label, font=font)
    text_w = bbox[2] - bbox[0]
    draw.text((x + (CELL_W - text_w) / 2, text_y), label, fill=(0, 0, 0), font=font)

composite.save(OUT_PATH, dpi=(500, 500))
print("saved", OUT_PATH, composite.size)
