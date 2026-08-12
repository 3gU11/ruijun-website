import sys

import FreeCAD as App
import Import


doc = App.newDocument("CheckParts")
Import.insert(sys.argv[1], doc.Name)
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


parts = [obj for obj in doc.Objects if obj.TypeId == "Part::Feature"]
for index in (93, 140, 171, 377):
    obj = parts[index]
    shape = obj.Shape.copy()
    shape.Placement = world_placement(obj)
    box = shape.BoundBox
    print(index, repr(obj.Label), "Z", box.ZMin, box.ZMax, "X", box.XMin, box.XMax, "Y", box.YMin, box.YMax, flush=True)
