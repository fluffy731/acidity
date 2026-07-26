"""One-off: make the logo's black background transparent and save as PNG."""
from PIL import Image

img = Image.open("logo.jpg").convert("RGBA")
pixels = img.getdata()

new_pixels = []
threshold = 24
for r, g, b, a in pixels:
    if r < threshold and g < threshold and b < threshold:
        new_pixels.append((r, g, b, 0))
    else:
        new_pixels.append((r, g, b, a))

img.putdata(new_pixels)
img.save("assets/images/logo.png")
print("Saved assets/images/logo.png with transparent background")
