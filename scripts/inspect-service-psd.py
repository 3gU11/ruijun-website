from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image
from psd_tools import PSDImage


def layer_record(layer, depth: int) -> dict[str, object]:
    record: dict[str, object] = {
        "depth": depth,
        "name": layer.name,
        "kind": layer.kind,
        "visible": layer.visible,
        "bbox": [layer.left, layer.top, layer.right, layer.bottom],
    }
    if layer.kind == "type":
        record["text"] = layer.text
    return record


def walk_layers(layers, depth: int = 0):
    for layer in layers:
        yield layer_record(layer, depth)
        if layer.is_group():
            yield from walk_layers(layer, depth + 1)


def inspect_psd(path: Path, output_dir: Path, skip_preview: bool, asset_dir: Path | None) -> None:
    psd = PSDImage.open(path)
    output_dir.mkdir(parents=True, exist_ok=True)

    metadata = {
        "file": str(path),
        "width": psd.width,
        "height": psd.height,
        "layers": list(walk_layers(psd)),
    }
    metadata_path = output_dir / f"{path.stem}.json"
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"{path.name}: {psd.width}x{psd.height}, {len(metadata['layers'])} layers")
    print(f"  metadata: {metadata_path}")
    if not skip_preview:
        composite = psd.composite().convert("RGB")
        composite.thumbnail((1200, 4200), Image.Resampling.LANCZOS)
        preview_path = output_dir / f"{path.stem}.jpg"
        composite.save(preview_path, quality=90, optimize=True)
        print(f"  preview:  {preview_path}")
    if asset_dir and path.stem == "教学视频":
        asset_dir.mkdir(parents=True, exist_ok=True)
        for layer in psd.descendants():
            if layer.kind == "smartobject" and layer.name in {"1", "2", "3", "4", "5", "6"}:
                asset_path = asset_dir / f"service-video-{layer.name}.png"
                layer.composite().save(asset_path)
                print(f"  asset:    {asset_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect and preview service-support PSD files.")
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--skip-preview", action="store_true")
    parser.add_argument("--asset-dir", type=Path)
    args = parser.parse_args()

    for path in sorted(args.source.glob("*.psd")):
        inspect_psd(path, args.output, args.skip_preview, args.asset_dir)


if __name__ == "__main__":
    main()
