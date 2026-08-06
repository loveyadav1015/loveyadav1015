"""
generate_wanted.py
----------------------------------------------------
Composites your live GitHub avatar + name onto the WANTED poster
template (assets/wanted-template.jpg) and saves the result to
assets/wanted-poster.png.

Run by .github/workflows/wanted.yml so the poster always shows your
current avatar, the same way the compass/snake widgets stay live.

Requires: pip install pillow requests
Env vars:
  GH_LOGIN - your GitHub username (falls back to github.repository_owner)
  NAME     - display name to print on the poster (default "Love Yadav")
  BOUNTY   - optional bounty amount string, e.g. "864,000,000-" (blank = omit)
"""

import os
import io
import requests
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageEnhance

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "..", "assets")

TEMPLATE_PATH = os.path.join(ASSETS, "wanted-template.jpg")
OUTPUT_PATH = os.path.join(ASSETS, "wanted-poster.png")

# Photo box coordinates measured on the template (pixels)
BOX = (60, 218, 595, 620)  # left, top, right, bottom

# Where the name goes, between "DEAD OR ALIVE" and the bounty/footer
NAME_Y = 715
BOUNTY_Y = 800

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
]


def load_font(size):
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def fetch_avatar(login):
    url = f"https://github.com/{login}.png?size=800"
    resp = requests.get(url, timeout=15)
    resp.raise_for_status()
    return Image.open(io.BytesIO(resp.content)).convert("RGB")


def cover_fit(img, box_w, box_h):
    """Resize+crop image to exactly fill box_w x box_h, preserving aspect ratio."""
    src_ratio = img.width / img.height
    box_ratio = box_w / box_h
    if src_ratio > box_ratio:
        new_h = box_h
        new_w = int(box_h * src_ratio)
    else:
        new_w = box_w
        new_h = int(box_w / src_ratio)
    img = img.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - box_w) // 2
    top = (new_h - box_h) // 2
    return img.crop((left, top, left + box_w, top + box_h))


def sepia_tint(img, strength=0.35):
    """Blend a light sepia tone into the avatar so it matches the aged paper."""
    gray = ImageOps.grayscale(img)
    sepia = ImageOps.colorize(gray, black="#2b1a10", white="#e8d9b5")
    return Image.blend(img, sepia, strength)


def main():
    login = os.environ.get("GH_LOGIN", "loveyadav1015")
    name = os.environ.get("NAME", "Love Yadav")
    bounty = os.environ.get("BOUNTY", "")

    template = Image.open(TEMPLATE_PATH).convert("RGB")
    avatar = fetch_avatar(login)

    left, top, right, bottom = BOX
    box_w, box_h = right - left, bottom - top

    fitted = cover_fit(avatar, box_w, box_h)
    fitted = sepia_tint(fitted, strength=0.3)
    fitted = ImageEnhance.Contrast(fitted).enhance(1.05)

    poster = template.copy()
    poster.paste(fitted, (left, top))

    draw = ImageDraw.Draw(poster)
    ink = (58, 38, 22)

    name_font = load_font(64)
    name_upper = name.upper()
    bbox = draw.textbbox((0, 0), name_upper, font=name_font)
    name_w = bbox[2] - bbox[0]
    draw.text(((poster.width - name_w) / 2, NAME_Y), name_upper, font=name_font, fill=ink)

    if bounty:
        bounty_font = load_font(46)
        bounty_text = f"{bounty} ฿"
        bbox = draw.textbbox((0, 0), bounty_text, font=bounty_font)
        bounty_w = bbox[2] - bbox[0]
        draw.text(((poster.width - bounty_w) / 2, BOUNTY_Y), bounty_text, font=bounty_font, fill=ink)

    poster.save(OUTPUT_PATH)
    print(f"Saved poster for {name} ({login}) -> {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
