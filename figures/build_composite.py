from PIL import Image, ImageDraw, ImageFont
import os

SRC_DIR = r"C:\Users\User\Desktop\PB\module_screenshots"
OUT_PATH = r"C:\Users\User\Desktop\PB\module_composite.png"

modules = [
    ("main-road", "Main Road"),
    ("roundabout", "Roundabout"),
    ("t-junction", "T-Junction"),
    ("pedestrian", "Pedestrian"),
    ("bus-idling", "Bus Idling"),
    ("institutional-idling", "Institutional Idling"),
]

# Load and letterbox each screenshot to a common cell size, cropping to the
# top portion (where the module's distinctive UI is) since some screens are
# much taller-looking than others once content varies.
CELL_W, CELL_H = 480, 700
LABEL_H = 60
PAD = 16

try:
    font = ImageFont.truetype("arialbd.ttf", 32)
except Exception:
    font = ImageFont.load_default()

cells = []
for slug, label in modules:
    img = Image.open(os.path.join(SRC_DIR, f"{slug}.png")).convert("RGB")
    # scale to fit width, crop/pad to CELL_H
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
    draw.rectangle([x, y, x + CELL_W - 1, y + CELL_H - 1], outline=(0, 0, 0), width=2)
    text_y = y + CELL_H + 10
    bbox = draw.textbbox((0, 0), label, font=font)
    text_w = bbox[2] - bbox[0]
    draw.text((x + (CELL_W - text_w) / 2, text_y), label, fill=(0, 0, 0), font=font)

composite.save(OUT_PATH, dpi=(300, 300))
print("saved", OUT_PATH, composite.size)
