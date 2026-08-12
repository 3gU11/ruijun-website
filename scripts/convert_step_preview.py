import json
import os
import re
import sys
import traceback

import FreeCAD as App
import Import
import Mesh
import MeshPart


def safe_name(value, fallback):
    value = value or fallback
    value = re.sub(r"[^0-9A-Za-z_.-]+", "_", value).strip("_")
    return value[:120] or fallback


def main():
    if len(sys.argv) < 3:
        raise SystemExit("Usage: convert_step_preview.py input.step output.obj [manifest.json]")

    input_step = os.path.abspath(sys.argv[1])
    output_obj = os.path.abspath(sys.argv[2])
    output_manifest = os.path.abspath(sys.argv[3]) if len(sys.argv) > 3 else os.path.splitext(output_obj)[0] + ".json"
    os.makedirs(os.path.dirname(output_obj), exist_ok=True)

    print("Importing STEP:", input_step, flush=True)
    doc = App.newDocument("MachineStepImport")
    Import.insert(input_step, doc.Name)
    source_objects = [obj for obj in doc.Objects if obj.TypeId == "Part::Feature"]
    doc = App.ActiveDocument
    if doc is None:
        raise RuntimeError("STEP importer did not create an active document")
    doc.recompute()

    parent_by_child = {}
    for container in doc.Objects:
        for child in getattr(container, "Group", []) or []:
            parent_by_child[child.Name] = container

    placement_cache = {}

    def world_placement(source):
        cached = placement_cache.get(source.Name)
        if cached is not None:
            return cached
        result = source.Placement
        parent = parent_by_child.get(source.Name)
        visited = {source.Name}
        while parent is not None and parent.Name not in visited:
            visited.add(parent.Name)
            result = parent.Placement.multiply(result)
            parent = parent_by_child.get(parent.Name)
        placement_cache[source.Name] = result
        return result

    mesh_objects = []
    manifest = []
    for index, source in enumerate(source_objects):
        shape = getattr(source, "Shape", None)
        if shape is None or shape.isNull():
            continue

        label = getattr(source, "Label", "") or getattr(source, "Name", "")
        object_name = safe_name(label, "part_%04d" % index)
        try:
            placed_shape = shape.copy()
            placed_shape.Placement = world_placement(source)
            mesh = MeshPart.meshFromShape(
                Shape=placed_shape,
                LinearDeflection=1.0,
                AngularDeflection=0.35,
                Relative=False,
            )
            if mesh.CountFacets == 0:
                continue
            mesh_object = doc.addObject("Mesh::Feature", "Mesh_%04d" % index)
            mesh_object.Label = object_name
            mesh_object.Mesh = mesh
            mesh_objects.append(mesh_object)
            manifest.append(
                {
                    "index": index,
                    "source_name": getattr(source, "Name", ""),
                    "source_label": label,
                    "mesh_name": mesh_object.Name,
                    "mesh_label": object_name,
                    "facets": mesh.CountFacets,
                }
            )
            print("Meshed %d/%d: %s (%d facets)" % (len(mesh_objects), len(source_objects), object_name, mesh.CountFacets), flush=True)
        except Exception as exc:
            print("Skipped %s: %s" % (object_name, exc), flush=True)

    if not mesh_objects:
        raise RuntimeError("No shape-bearing objects were imported from STEP")

    print("Exporting OBJ:", output_obj, flush=True)
    Mesh.export(mesh_objects, output_obj)
    with open(output_manifest, "w", encoding="utf-8") as handle:
        json.dump(
            {
                "source": input_step,
                "object_count": len(manifest),
                "objects": manifest,
            },
            handle,
            ensure_ascii=False,
            indent=2,
        )
    print("Wrote %d mesh objects" % len(mesh_objects), flush=True)
    print("Manifest:", output_manifest, flush=True)
    App.closeDocument(doc.Name)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        raise
