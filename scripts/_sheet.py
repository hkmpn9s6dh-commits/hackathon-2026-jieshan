from PIL import Image, ImageDraw
import os

files = [
    ("00-封面.png", "封面"),
    ("01-第一关-借山.png", "1527 凤谷行窝 · 借山"),
    ("02-第二关-借塔.png", "1599 寄畅园 · 借塔"),
    ("03-第三关-入画.png", "1751 南巡 · 借进一张画"),
    ("04-第四关-庚申.png", "1860 庚申 · 只借一线"),
    ("05-第五关-回借.png", "2026 回借 · 把记忆放回去"),
]
base = "submission"
cw, ch = 800, 450
pad, gap, cap = 28, 14, 34
W = pad * 2 + cw * 3 + gap * 2
H = pad * 2 + (ch + cap) * 2 + gap
sheet = Image.new("RGB", (W, H), "#efe7d6")
d = ImageDraw.Draw(sheet)
for i, (f, label) in enumerate(files):
    im = Image.open(os.path.join(base, f)).convert("RGB").resize((cw, ch), Image.LANCZOS)
    x = pad + (i % 3) * (cw + gap)
    y = pad + (i // 3) * (ch + cap + gap)
    sheet.paste(im, (x, y))
    d.text((x + 4, y + ch + 8), label, fill="#3a3a32")
sheet.save("submission/contact-sheet.jpg", "JPEG", quality=86, optimize=True)
print("contact-sheet", sheet.size, round(os.path.getsize("submission/contact-sheet.jpg") / 1024), "KB")
