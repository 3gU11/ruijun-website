import json
import os
import sys

import bpy


def main():
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]
    if len(args) < 2:
        raise SystemExit("Usage: obj_to_glb.py input.obj output.glb [report.json]")

    input_obj = os.path.abspath(args[0])
    output_glb = os.path.abspath(args[1])
    report_path = os.path.abspath(args[2]) if len(args) > 2 else os.path.splitext(output_glb)[0] + ".json"
    os.makedirs(os.path.dirname(output_glb), exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    print("Importing OBJ:", input_obj, flush=True)
    bpy.ops.wm.obj_import(filepath=input_obj, use_split_objects=True, use_split_groups=True)
    objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not objects:
        raise RuntimeError("Blender imported no mesh objects")

    print("Imported mesh objects:", len(objects), flush=True)
    bpy.ops.export_scene.gltf(
        filepath=output_glb,
        export_format="GLB",
        export_apply=True,
        export_materials="EXPORT",
    )
    report = {
        "source": input_obj,
        "object_count": len(objects),
        "objects": [obj.name for obj in objects],
        "output": output_glb,
    }
    with open(report_path, "w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
    print("Wrote GLB:", output_glb, flush=True)
    print("Report:", report_path, flush=True)


if __name__ == "__main__":
    main()
