"""Regenerate the menu QR code.
Usage: python scripts/generate_qr.py https://your-domain.com/menu.html
"""
import sys
import qrcode

url = sys.argv[1] if len(sys.argv) > 1 else "https://acidity-bar-coffee.example.com/menu.html"

img = qrcode.make(url, box_size=10, border=2)
img.save("assets/images/menu-qr.png")
print(f"Saved QR code for: {url}")
