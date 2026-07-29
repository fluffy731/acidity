"""Composite the transparent logo onto a solid brand-green backdrop for the favicon."""
from PIL import Image

BG = (51, 81, 63, 255)  # --green-deep
SIZE = 256
PADDING = 30

logo = Image.open("assets/images/logo.png").convert("RGBA")

canvas = Image.new("RGBA", (SIZE, SIZE), BG)

inner = SIZE - PADDING * 2
logo_resized = logo.copy()
logo_resized.thumbnail((inner, inner), Image.LANCZOS)

x = (SIZE - logo_resized.width) // 2
y = (SIZE - logo_resized.height) // 2
canvas.paste(logo_resized, (x, y), logo_resized)

canvas.save("assets/images/favicon.png")
print("Saved assets/images/favicon.png")
