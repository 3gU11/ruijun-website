import sys

import FreeCAD as App
import Import


step_path = sys.argv[1]
doc = App.newDocument("AnalyzeCenterBottom")
Import.insert(step_path, doc.Name)
parent_by_child = {}
for container in doc.Objects:
    for child in getattr(container, "Group", []) or []:
        parent_by_child[child.Name] = container
cache = {}


def world_placement(obj):
    if obj.Name in cache:
        return cache[obj.Name]
    value = obj.Placement
    parent = parent_by_child.get(obj.Name)
    seen = {obj.Name}
    while parent is not None and parent.Name not in seen:
        seen.add(parent.Name)
        value = parent.Placement.multiply(value)
        parent = parent_by_child.get(parent.Name)
    cache[obj.Name] = value
    return value


rows = []
for obj in doc.Objects:
    if obj.TypeId != "Part::Feature" or obj.Shape.isNull():
        continue
    shape = obj.Shape.copy()
    shape.Placement = world_placement(obj)
    box = shape.BoundBox
    cx = (box.XMin + box.XMax) / 2
    cy = (box.YMin + box.YMax) / 2
    cz = (box.ZMin + box.ZMax) / 2
    sx = box.XMax - box.XMin
    sy = box.YMax - box.YMin
    sz = box.ZMax - box.ZMin
    if abs(cx) < 350 and abs(cy) < 500 and box.ZMin < -250:
        rows.append((abs(cx) + abs(cy), box.ZMin, box.ZMax, cx, cy, cz, sx, sy, sz, obj.Label))

for row in sorted(rows)[:80]:
    print("DIST %.1f Z %.1f..%.1f C %.1f,%.1f,%.1f SIZE %.1f,%.1f,%.1f %s" % row, flush=True)
