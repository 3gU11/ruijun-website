from pathlib import Path

from psd_tools import PSDImage


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "素材" / "产品展示" / "产品页(2).psd"
OUTPUT = ROOT / "website" / "public" / "assets" / "psd" / "product-detail"


def find_layer(layers, path):
    current = layers
    for name in path:
        current = next(layer for layer in current if layer.name == name)
    return current


LAYERS = {
    "workstation-machine": ("产品", "产品详细介绍", "灵动", "灵动"),
    "auto-machine": ("产品", "产品详细介绍", "fr-xs(auto)", "500", "500自动穿丝"),
    "pro-machine": ("产品", "产品详细介绍", "fr-xs(pro)", "7055", "新FR 7055XS"),
    "ft-machine": ("产品", "产品详细介绍", "ft-xs", "FT400xs"),
    "fr-y-machine": ("产品", "产品详细介绍", "fr-y", "FR-Y侧"),
    "fl-machine": ("产品", "产品详细介绍", "fl-xs ", "FL 1390 - 侧"),
    "auto-threading": ("产品", "产品详细介绍", "fr-xs(auto)", "特点", "1"),
    "auto-tension": ("产品", "产品详细介绍", "fr-xs(auto)", "特点", "2"),
    "auto-adaptive": ("产品", "产品详细介绍", "fr-xs(auto)", "特点", "3"),
    "pro-adaptive": ("产品", "产品详细介绍", "fr-xs(pro)", "特点", "自适应"),
    "pro-efficiency": ("产品", "产品详细介绍", "fr-xs(pro)", "特点", "效率50"),
    "pro-handheld": ("产品", "产品详细介绍", "fr-xs(pro)", "特点", "手持单元"),
    "fr-y-swing": ("产品", "产品详细介绍", "fr-y", "特点", "1"),
    "fr-y-taper": ("产品", "产品详细介绍", "fr-y", "特点", "2"),
    "fr-y-handheld": ("产品", "产品详细介绍", "fr-y", "特点", "3"),
    "dimension-drawings": ("产品", "尺寸图"),
}


def reveal_ancestors(layer):
    current = layer.parent
    while current is not None and current.kind != "psdimage":
        current.visible = True
        current = getattr(current, "parent", None)


def main():
    psd = PSDImage.open(SOURCE)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for output_name, path in LAYERS.items():
        layer = find_layer(psd, path)
        reveal_ancestors(layer)
        image = layer.composite(force=True)
        if image is None or image.getbbox() is None:
            raise RuntimeError(f"No visible pixels for {'/'.join(path)}")
        destination = OUTPUT / f"{output_name}.png"
        image.save(destination)
        print(f"{output_name}: {layer.bbox} -> {destination}")


if __name__ == "__main__":
    main()
