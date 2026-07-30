"""One-off: process raw dropped-in assets (posters, gig photos, interior shots,
headshot) into optimised web images under assets/images/*."""
from pathlib import Path
from PIL import Image, ImageOps
import pypdfium2 as pdfium

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets"
IMAGES = ROOT / "assets" / "images"


def save_jpg(img, dest, max_w, quality=82):
    img = ImageOps.exif_transpose(img).convert("RGB")
    if img.width > max_w:
        h = round(img.height * max_w / img.width)
        img = img.resize((max_w, h), Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "JPEG", quality=quality, optimize=True)
    print(f"  -> {dest.relative_to(ROOT)}  ({img.width}x{img.height})")


def save_png(img, dest, max_w):
    img = ImageOps.exif_transpose(img)
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA")
    if img.width > max_w:
        h = round(img.height * max_w / img.width)
        img = img.resize((max_w, h), Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "PNG", optimize=True)
    print(f"  -> {dest.relative_to(ROOT)}  ({img.width}x{img.height})")


def pdf_first_page(path, scale=2.5):
    pdf = pdfium.PdfDocument(str(path))
    page = pdf[0]
    bitmap = page.render(scale=scale)
    return bitmap.to_pil()


print("== Interior / front-of-house ==")
save_jpg(Image.open(SRC / "Front face ACIDITY (1).jpg"), IMAGES / "interior" / "front-face.jpg", 1800)
for i in range(1, 8):
    p = SRC / f"shop interior {i}.jpg"
    save_jpg(Image.open(p), IMAGES / "interior" / f"interior-{i}.jpg", 1800)

print("== Gig photos ==")
save_jpg(Image.open(SRC / "DJ photo.JPG"), IMAGES / "gigs" / "dj-set.jpg", 1600)
save_jpg(Image.open(SRC / "gig photo 2.JPG"), IMAGES / "gigs" / "gig-2.jpg", 1600)
save_jpg(Image.open(SRC / "gig photo 3.jpg"), IMAGES / "gigs" / "gig-3.jpg", 1600)

print("== Performer headshot ==")
save_jpg(Image.open(SRC / "tony yang headshot lead guitarist for one of the gigs.jpg"), IMAGES / "performers" / "tony-yang.jpg", 900)

print("== Poster archive (already-image posters) ==")
poster_pngs = {
    "A24 poster movie night.png": "a24-movie-night.jpg",
    "Lauren valentine show poster.png": "lauren-valentine-show.jpg",
    "coffee rave poster 24 May.png": "coffee-rave-24-may.jpg",
    "gig May 30.png": "jazz-trio-30-may.jpg",
    "jazz gig poster.png": "jazz-gig.jpg",
    "moonmaze poster.png": "moonmaze.jpg",
    "real book gig 11July poster.png": "real-book-gig-11-july.jpg",
    "sound sample 18 July poster.jpg": "sound-sample-18-july.jpg",
}
for src_name, dest_name in poster_pngs.items():
    save_jpg(Image.open(SRC / src_name), IMAGES / "posters" / dest_name, 1400)

print("== Poster archive (PDF posters) ==")
poster_pdfs = {
    "1 Aug gig poster.pdf": "wes-montgomery-1-aug.jpg",
    "10 Aug gig poster.pdf": "gig-10-aug.jpg",
    "24 JULY FRI gig poster.pdf": "gig-24-july.jpg",
    "8 Aug gig poster.pdf": "gig-8-aug.jpg",
    "COFFEE RAVE + JAZZ JAM poster.pdf": "coffee-rave-jazz-jam.jpg",
}
for src_name, dest_name in poster_pdfs.items():
    img = pdf_first_page(SRC / src_name)
    save_jpg(img, IMAGES / "posters" / dest_name, 1400)

print("== Sound Sample triptych (compose 1 | 3 | 2 left-to-right, reads 'SOUND SAMPLE '26') ==")
panels = [Image.open(SRC / f"soundsample{n}.png") for n in (1, 3, 2)]
panels = [ImageOps.exif_transpose(p).convert("RGB") for p in panels]
h = min(p.height for p in panels)
panels = [p.resize((round(p.width * h / p.height), h), Image.LANCZOS) for p in panels]
total_w = sum(p.width for p in panels)
combo = Image.new("RGB", (total_w, h), "white")
x = 0
for p in panels:
    combo.paste(p, (x, 0))
    x += p.width
save_jpg(combo, IMAGES / "posters" / "sound-sample-triptych.jpg", 2400)

print("\nDone.")
