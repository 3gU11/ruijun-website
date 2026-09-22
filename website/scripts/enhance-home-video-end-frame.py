from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ASSETS = Path(__file__).resolve().parents[1] / 'public' / 'assets'
SOURCES = [
    ASSETS / '_video-end-304.png',
    ASSETS / '_video-end-307.png',
    ASSETS / '_video-end-308.png',
    ASSETS / '_video-end-309.png',
]
OUTPUT = ASSETS / 'home-intro-end-video-sharpened.png'


def main() -> None:
    frames = [np.asarray(Image.open(path).convert('RGB'), dtype=np.uint8) for path in SOURCES]
    if len({frame.shape for frame in frames}) != 1:
        raise ValueError('Video end-frame sources must share identical dimensions.')

    # A median removes codec noise without changing the source canvas or composition.
    merged = np.median(np.stack(frames, axis=0), axis=0).astype(np.uint8)
    image = Image.fromarray(merged, mode='RGB').filter(
        ImageFilter.UnsharpMask(radius=1.35, percent=145, threshold=2)
    )
    image.save(OUTPUT, optimize=True)
    print(f'Saved {OUTPUT.name}: {image.width}x{image.height}')


if __name__ == '__main__':
    main()
