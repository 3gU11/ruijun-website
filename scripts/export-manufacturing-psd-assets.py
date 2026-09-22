from pathlib import Path

from psd_tools import PSDImage


ROOT = Path(__file__).resolve().parents[1]
SOURCE_SIZE = 163715141
OUTPUT = ROOT / 'demo' / 'assets' / 'manufacturing-psd'


def find_layer(layers, *names):
    current = layers
    for name in names:
        current = next(layer for layer in current if layer.name == name)
    return current


def save_layer(layer, name):
    image = layer.composite()
    if image is None:
        raise RuntimeError(f'Layer has no pixels: {layer.name}')
    path = OUTPUT / name
    image.save(path)
    print(f'{path.name}: {image.size}')


def main():
    psd_path = next(path for path in ROOT.rglob('*.psd') if path.stat().st_size == SOURCE_SIZE)
    psd = PSDImage.open(psd_path)
    product = find_layer(psd, '产品')
    banner = find_layer(product, 'BANNER')
    cnc = find_layer(product, 'CNC车间')
    metal = find_layer(product, '钣金车间')
    assembly = find_layer(product, '装配车间')
    electrical = find_layer(product, '电气装配')
    inspection = find_layer(product, '精密检测')
    warehouse = find_layer(product, '立库')
    equipment = find_layer(product, '生产设备图片')

    OUTPUT.mkdir(parents=True, exist_ok=True)
    save_layer(find_layer(banner, '大楼1'), 'hero-building.png')
    save_layer(find_layer(banner, '装配车间1'), 'hero-production-line.png')
    save_layer(find_layer(product, '先进制造背景图'), 'cnc-background.png')
    save_layer(find_layer(product, '先进制造背景图 拷贝'), 'assembly-background.png')
    save_layer(find_layer(product, '先进制造背景图 拷贝 2'), 'inspection-background.png')
    save_layer(find_layer(cnc, '大隈龙门'), 'cnc-main.png')
    save_layer(find_layer(cnc, '大隈卧加'), 'cnc-horizontal.png')
    save_layer(find_layer(cnc, '导轨磨'), 'cnc-rail-grinder.png')
    save_layer(find_layer(cnc, '建德磨床'), 'cnc-surface-grinder.png')
    save_layer(find_layer(cnc, '大隈立加'), 'cnc-vertical.png')
    save_layer(find_layer(cnc, '威力龙门'), 'cnc-gantry.png')
    save_layer(find_layer(metal, '折弯中心'), 'metal-bending-center.png')
    save_layer(find_layer(metal, '激光'), 'metal-laser.png')
    save_layer(find_layer(metal, '折弯'), 'metal-bending.png')
    save_layer(find_layer(metal, '喷涂'), 'metal-coating.png')
    save_layer(find_layer(assembly, '装配车间3'), 'assembly-line.png')
    save_layer(find_layer(assembly, '装配车间2'), 'assembly-detail.png')
    save_layer(find_layer(electrical, '电气'), 'electrical-bench.png')
    save_layer(find_layer(electrical, '电柜'), 'electrical-cabinet.png')
    save_layer(find_layer(inspection, '1'), 'inspection-main.png')
    save_layer(find_layer(inspection, '激光干涉'), 'inspection-laser.png')
    save_layer(find_layer(inspection, '影像仪'), 'inspection-vision.png')
    save_layer(find_layer(inspection, '三坐标'), 'inspection-coordinate.png')
    save_layer(find_layer(inspection, '球杆仪'), 'inspection-ballbar.png')
    save_layer(find_layer(warehouse, '立库'), 'warehouse.png')
    for layer in equipment:
        if not layer.is_group() and layer.name != '生产核心设备':
            save_layer(layer, f"equipment-{layer.name.replace('/', '-')}.png")


if __name__ == '__main__':
    main()
