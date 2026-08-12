import sys
import FreeCAD as App
import Import

step_path = sys.argv[1]
print("OPENING", step_path, flush=True)
objects = Import.open(step_path)
print("RETURN_TYPE", type(objects).__name__, flush=True)
print("OBJECTS", len(objects), flush=True)
for obj in objects[:10]:
    print("OBJ_TYPE", type(obj).__name__, repr(obj)[:500], flush=True)
