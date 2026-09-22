from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from psd_tools import PSDImage


ROOT = Path(__file__).resolve().parents[1]
PSD_PATH = ROOT / "素材" / "服务支持" / "技术支持(1).psd"
SOURCE_PATH = ROOT / "website" / "public" / "assets" / "service-library-hero-v3.jpg"
OUTPUT_PATH = ROOT / "website" / "public" / "assets" / "service-library-hero-v4.jpg"

PSD_HERO_WIDTH = 3840
PSD_HERO_HEIGHT = 1930
# The exported hero is a cropped/resampled version of the PSD. These are the
# actual glyph bounds in the 2126x1030 hero, not the PSD canvas coordinates.
TEXT_BOUNDS = (
    (1215, 325, 1810, 540),
    (1360, 570, 1530, 615),
)
BUTTON_GRAPHIC_BOUNDS = (1320, 550, 2126, 635)


def main() -> None:
    source = Image.open(SOURCE_PATH).convert("RGB")
    scale_x = source.width / PSD_HERO_WIDTH
    scale_y = source.height / PSD_HERO_HEIGHT

    source_array = np.asarray(source)
    mask = np.zeros((source.height, source.width), dtype=np.uint8)
    for left, top, right, bottom in TEXT_BOUNDS:
        crop = source_array[top:bottom, left:right]
        brightness = cv2.cvtColor(crop, cv2.COLOR_RGB2GRAY)
        threshold = 175 if top > 540 else 112
        glyph_mask = (brightness > threshold).astype(np.uint8) * 255
        glyph_mask = cv2.dilate(glyph_mask, np.ones((3, 3), np.uint8), iterations=1)
        mask[top:bottom, left:right] = np.maximum(mask[top:bottom, left:right], glyph_mask)

    left, top, right, bottom = BUTTON_GRAPHIC_BOUNDS
    button_crop = source_array[top:bottom, left:right]
    red_mask = (
        (button_crop[:, :, 0] > 105)
        & (button_crop[:, :, 0] > button_crop[:, :, 1] * 1.35)
        & (button_crop[:, :, 0] > button_crop[:, :, 2] * 1.2)
    ).astype(np.uint8) * 255
    red_mask = cv2.dilate(red_mask, np.ones((5, 5), np.uint8), iterations=1)
    mask[top:bottom, left:right] = np.maximum(mask[top:bottom, left:right], red_mask)

    bgr = cv2.cvtColor(np.asarray(source), cv2.COLOR_RGB2BGR)
    repaired = cv2.inpaint(bgr, mask, 4, cv2.INPAINT_TELEA)
    output = Image.fromarray(cv2.cvtColor(repaired, cv2.COLOR_BGR2RGB))

    output.save(OUTPUT_PATH, quality=95, optimize=True, subsampling=0)
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()
