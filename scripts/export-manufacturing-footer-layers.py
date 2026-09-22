import json
from pathlib import Path

from psd_tools import PSDImage


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "素材" / "先进制造.psd"
OUTPUT = ROOT / "demo" / "assets" / "manufacturing-psd" / "layers"


def find(layers, name):
    return next(layer for layer in layers if layer.name == name)


def visible_art_layers(group):
    for layer in reversed(group):
        if not layer.visible:
            continue
        if layer.is_group():
            yield from visible_art_layers(layer)
        else:
            yield layer


def main():
    psd = PSDImage.open(SOURCE)
    footer = find(psd, "压底")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    for index, layer in enumerate(visible_art_layers(footer), start=1):
        image = layer.composite()
        if image is None:
            continue
        name = f"footer-{index:02d}"
        image.save(OUTPUT / f"{name}.png")
        left, top, right, bottom = layer.bbox
        manifest.append({
            "name": name,
            "sourceName": layer.name,
            "x": left,
            "y": top,
            "width": right - left,
            "height": bottom - top,
        })
    (OUTPUT / "footer-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
