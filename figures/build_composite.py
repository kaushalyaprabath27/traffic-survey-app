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

# 2x3 grid (3 rows, 2 columns): screenshots are now landscape (surveyors
# hold the device landscape in the field), captured at 1300x600 viewport,
# device_scale_factor=2 -> native 2600x1200 per screenshot. A single row
# of six landscape cells would be exactly as unreadable at print column
# width as the original single-row portrait layout was; a 2-column grid
# (landscape cells stacked in 3 rows) keeps each cell close to full print
# column width, which is what landscape screenshots need to stay legible.
# Cell size matches the screenshots' native captured resolution exactly,
# not upsampled, so the composite can be tagged at 500 dpi honestly.
CELL_W, CELL_H = 2600, 1200
LABEL_H = 220
PAD = 42

try:
    font = ImageFont.truetype("arialbd.ttf", 170)
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

cols, rows = 2, 3
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
