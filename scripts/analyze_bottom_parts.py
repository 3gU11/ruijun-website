import sys

import FreeCAD as App
import Import


step_path = sys.argv[1]
doc = App.newDocument("AnalyzeAssembly")
Import.insert(step_path, doc.Name)

parent_by_child = {}
for container in doc.Objects:
    for child in getattr(container, "Group", []) or []:
        parent_by_child[child.Name] = container

cache = {}


def world_placement(obj):
    if obj.Name in cache:
        return cache[obj.Name]
    placement = obj.Placement
    parent = parent_by_child.get(obj.Name)
    seen = {obj.Name}
    while parent is not None and parent.Name not in seen:
        seen.add(parent.Name)
        placement = parent.Placement.multiply(placement)
        parent = parent_by_child.get(parent.Name)
    cache[obj.Name] = placement
    return placement


rows = []
for obj in doc.Objects:
    if obj.TypeId != "Part::Feature" or obj.Shape.isNull():
        continue
    shape = obj.Shape.copy()
    shape.Placement = world_placement(obj)
    box = shape.BoundBox
    rows.append((box.ZMin, box.ZMax, box.XMin, box.XMax, box.YMin, box.YMax, obj.Label))

for row in sorted(rows)[:40]:
    print("ZMIN %.2f ZMAX %.2f X %.2f..%.2f Y %.2f..%.2f %s" % row, flush=True)
