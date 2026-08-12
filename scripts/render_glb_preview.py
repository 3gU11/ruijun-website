import os
import sys

import bpy
from mathutils import Vector


def main():
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]
    if len(args) < 2:
        raise SystemExit("Usage: render_glb_preview.py input.glb output.png")
    input_glb = os.path.abspath(args[0])
    output_png = os.path.abspath(args[1])
    os.makedirs(os.path.dirname(output_png), exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=input_glb)
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError("No mesh objects in GLB")

    corners = []
    for obj in meshes:
        corners.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    min_corner = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
    max_corner = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
    center = (min_corner + max_corner) * 0.5
    size = max(max_corner - min_corner)

    camera_data = bpy.data.cameras.new("PreviewCamera")
    camera = bpy.data.objects.new("PreviewCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = center + Vector((size * 1.6, -size * 1.6, size * 1.2))
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.lens = 52
    camera_data.clip_start = max(size * 0.00001, 0.001)
    camera_data.clip_end = size * 20.0
    bpy.context.scene.camera = camera

    for name, location, energy, size_light in [
        ("Key", center + Vector((size, -size, size * 2.0)), 1800, size),
        ("Fill", center + Vector((-size, -size, size)), 1000, size),
        ("Rim", center + Vector((size, size, size * 1.5)), 1400, size),
    ]:
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.energy = energy
        light_data.shape = "DISK"
        light_data.size = size_light
        light = bpy.data.objects.new(name, light_data)
        bpy.context.collection.objects.link(light)
        light.location = location
        light.rotation_euler = (center - location).to_track_quat("-Z", "Y").to_euler()

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.display.shading.light = "STUDIO"
    scene.display.shading.studio_light = "paint.sl"
    scene.display.shading.color_type = "MATERIAL"
    scene.render.filepath = output_png
    scene.render.film_transparent = False
    if scene.world is None:
        scene.world = bpy.data.worlds.new("PreviewWorld")
    scene.world.color = (0.04, 0.04, 0.04)
    bpy.ops.render.render(write_still=True)
    print("Wrote preview:", output_png, flush=True)


if __name__ == "__main__":
    main()
