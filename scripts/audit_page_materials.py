"""Compare categorized source materials with the website's exported assets."""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path

from psd_tools import PSDImage


ROOT = Path(__file__).resolve().parents[1]
MATERIALS = ROOT / "素材"
WEBSITE = ROOT / "website"
ASSETS = WEBSITE / "public" / "assets"
OUTPUT = ROOT / "output" / "material-audit"

PAGE_GROUPS = {
    "网站主页": {"page": "pages/index.vue", "asset_terms": ("home", "hero", "reason", "product", "psd")},
    "关于瑞钧": {"page": "pages/about.vue", "asset_terms": ("about", "history")},
    "先进智造": {"page": "pages/manufacturing.vue", "asset_terms": ("manufacturing",)},
    "产品展示": {"page": "pages/product/[slug].vue", "asset_terms": ("product", "psd")},
    "服务支持": {"page": "pages/service.vue", "asset_terms": ("service",)},
    "视频新闻": {"page": "pages/news.vue", "asset_terms": ("news", "exhibition")},
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def psd_info(path: Path) -> dict[str, object]:
    psd = PSDImage.open(path)
    layers = list(psd.descendants())
    leaves = [layer for layer in layers if not layer.is_group()]
    return {
        "path": str(path.relative_to(ROOT)),
        "canvas": f"{psd.width}x{psd.height}",
        "layerCount": len(layers),
        "visibleLeafCount": sum(layer.visible for layer in leaves),
    }


def referenced_assets(page: Path) -> list[str]:
    text = page.read_text(encoding="utf-8")
    return sorted({line.split("/assets/", 1)[1].split("'", 1)[0].split('"', 1)[0].split("?", 1)[0]
                   for line in text.splitlines() if "/assets/" in line})


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    asset_files = [path for path in ASSETS.rglob("*") if path.is_file()]
    source_files = [path for path in MATERIALS.rglob("*") if path.is_file()]
    asset_hashes = {sha256(path): path for path in asset_files}
    report: dict[str, object] = {"pages": {}, "exactMatches": []}

    for group, config in PAGE_GROUPS.items():
        source_group = MATERIALS / group
        sources = [path for path in source_group.rglob("*") if path.is_file()]
        psds = [psd_info(path) for path in sources if path.suffix.lower() == ".psd"]
        exact = []
        for source in sources:
            match = asset_hashes.get(sha256(source))
            if match:
                item = {"source": str(source.relative_to(ROOT)), "websiteAsset": str(match.relative_to(WEBSITE))}
                exact.append(item)
                report["exactMatches"].append(item)
        terms = config["asset_terms"]
        candidates = [str(path.relative_to(WEBSITE)) for path in asset_files if any(term in str(path.relative_to(ASSETS)).lower() for term in terms)]
        page = WEBSITE / config["page"]
        report["pages"][group] = {
            "sourceFiles": [{"path": str(path.relative_to(ROOT)), "bytes": path.stat().st_size, "extension": path.suffix.lower()} for path in sources],
            "psds": psds,
            "page": str(page.relative_to(ROOT)),
            "referencedAssets": referenced_assets(page),
            "candidateExportedAssets": candidates,
            "exactHashMatches": exact,
        }

    (OUTPUT / "material-audit.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    lines = ["# Page Material Audit", "", "Generated from source materials, website asset files, and page source references.", ""]
    for group, item in report["pages"].items():
        lines.extend([f"## {group}", f"- Page: `{item['page']}`", f"- Source files: {len(item['sourceFiles'])}", f"- PSD files: {len(item['psds'])}", f"- Candidate exported assets: {len(item['candidateExportedAssets'])}", f"- Exact hash matches: {len(item['exactHashMatches'])}"])
        for psd in item["psds"]:
            lines.append(f"  - `{psd['path']}`: {psd['canvas']}, {psd['layerCount']} layers, {psd['visibleLeafCount']} visible leaf layers")
        for match in item["exactHashMatches"]:
            lines.append(f"  - Exact: `{match['source']}` -> `{match['websiteAsset']}`")
        lines.append("")
    lines.extend(["## Limits", "- Exact matches are verified by SHA-256.", "- PSD-to-export linkage is inferred from names and directories unless a matching export manifest exists.", "- Referenced assets are extracted only from the primary page file; components can add more shared assets.", ""])
    (OUTPUT / "material-audit.md").write_text("\n".join(lines), encoding="utf-8")
    print(OUTPUT / "material-audit.md")


if __name__ == "__main__":
    main()
