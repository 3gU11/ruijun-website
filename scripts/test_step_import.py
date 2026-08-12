import sys
import FreeCAD as App
import Part

step_path = sys.argv[1]
print("OPENING", step_path, flush=True)
doc = App.newDocument("StepTest")
Part.open(step_path)
print("OBJECTS", len(doc.Objects), flush=True)
for obj in doc.Objects[:10]:
    print("OBJ", obj.Name, getattr(obj, "Label", ""), flush=True)
App.closeDocument(doc.Name)
