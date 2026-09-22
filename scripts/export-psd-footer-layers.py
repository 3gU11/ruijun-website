import json
from pathlib import Path

from psd_tools import PSDImage


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "素材" / "新网站首页.psd"
OUTPUT = ROOT / "demo" / "assets" / "psd-footer"


def art_layers(group):
    for layer in reversed(group):
        if not layer.visible:
            continue
        if layer.is_group():
            yield from art_layers(layer)
        else:
            yield layer


def main():
    footer = next(layer for layer in PSDImage.open(SOURCE) if layer.name == "压底")
    left, top, right, bottom = footer.bbox
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    for index, layer in enumerate(art_layers(footer), start=1):
        image = layer.composite()
        if image is None:
            continue
        name = f"layer-{index:02d}"
        image.save(OUTPUT / f"{name}.png")
        x1, y1, x2, y2 = layer.bbox
        manifest.append({
            "name": name,
            "source": layer.name,
            "x": x1 - left,
            "y": y1 - top,
            "width": x2 - x1,
            "height": y2 - y1,
        })
    (OUTPUT / "manifest.json").write_text(json.dumps({"width": right - left, "height": bottom - top, "layers": manifest}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
