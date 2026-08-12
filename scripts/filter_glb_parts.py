import json
import os
import sys

import bpy


def main():
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]
    if len(args) < 2:
        raise SystemExit("Usage: filter_glb_parts.py input.glb output.glb [report.json]")
    input_glb = os.path.abspath(args[0])
    output_glb = os.path.abspath(args[1])
    report_path = os.path.abspath(args[2]) if len(args) > 2 else os.path.splitext(output_glb)[0] + ".json"
    os.makedirs(os.path.dirname(output_glb), exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=input_glb)
    removed = []
    for obj in list(bpy.context.scene.objects):
        if obj.type != "MESH":
            continue
        dims = obj.dimensions
        if (
            obj.name == "FR-500_-8"
            and abs(dims.x - 20.0) < 0.5
            and abs(dims.y - 55.6) < 0.5
            and abs(dims.z - 780.0) < 1.0
        ):
            removed.append({"name": obj.name, "dimensions": tuple(dims)})
            bpy.data.objects.remove(obj, do_unlink=True)

    bpy.ops.export_scene.gltf(
        filepath=output_glb,
        export_format="GLB",
        export_apply=True,
        export_materials="EXPORT",
    )
    with open(report_path, "w", encoding="utf-8") as handle:
        json.dump({"source": input_glb, "removed": removed, "output": output_glb}, handle, ensure_ascii=False, indent=2)
    print("Removed objects:", len(removed), flush=True)
    print("Wrote GLB:", output_glb, flush=True)


if __name__ == "__main__":
    main()
