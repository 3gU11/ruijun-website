from pathlib import Path

from psd_tools import PSDImage


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "素材" / "先进制造.psd"
OUTPUT = ROOT / "demo" / "assets" / "manufacturing-psd" / "layers"


def find_layer(layers, path):
    current = layers
    for name in path:
        current = next(layer for layer in current if layer.name == name)
    return current


LAYERS = {
    "hero-building": ("产品", "BANNER", "大楼1"),
    "hero-panel": ("产品", "BANNER", "矩形 9"),
    "hero-process-copy": ("产品", "BANNER", "World’s top class production process "),
    "hero-output-copy": ("产品", "BANNER", "年产量可达10000台"),
    "hero-production-image": ("产品", "BANNER", "装配车间1"),
    "cnc-card-background": ("产品", "先进制造背景图"),
    "cnc-main": ("产品", "CNC车间", "大隈龙门"),
    "cnc-horizontal": ("产品", "CNC车间", "大隈卧加"),
    "cnc-rail-grinder": ("产品", "CNC车间", "导轨磨"),
    "cnc-surface-grinder": ("产品", "CNC车间", "建德磨床"),
    "cnc-vertical": ("产品", "CNC车间", "大隈立加"),
    "cnc-gantry": ("产品", "CNC车间", "威力龙门"),
    "cnc-title": ("产品", "CNC车间", "CNC车间"),
    "cnc-description": ("产品", "CNC车间", "自动化数控设备替代了传统的机械加工， 拥有 100 多台套加工母机"),
    "cnc-detail": ("产品", "CNC车间", "核心设备： 五面体龙门、五轴数控、立式、卧式等 各类加工中心、平面磨床、导轨磨床"),
    "metal-title": ("产品", "钣金车间", "钣金车间"),
    "metal-description": ("产品", "钣金车间", "集成先进的信息技术、自动化设备和工业软件， 实现生产过程的高效、精准、透明和柔性。"),
    "metal-detail": ("产品", "钣金车间", "智能核心设备：智能下料单元、智能成型单元、 智能焊接与连接单元、静电喷涂产线"),
    "metal-bending-center": ("产品", "钣金车间", "折弯中心"),
    "metal-laser": ("产品", "钣金车间", "激光"),
    "metal-bending": ("产品", "钣金车间", "折弯"),
    "metal-coating": ("产品", "钣金车间", "喷涂"),
    "assembly-card-background": ("产品", "先进制造背景图 拷贝"),
    "assembly-main": ("产品", "装配车间", "装配车间3"),
    "assembly-detail": ("产品", "装配车间", "装配车间2"),
    "assembly-title": ("产品", "装配车间", "装配车间"),
    "assembly-description": ("产品", "装配车间", "装配体系依托于恒温洁净的作业 环境，部署了20条全链路制程产 线。实现MES系统全流程智能化 管控."),
    "inspection-title": ("产品", "精密检测", "精密检测"),
    "inspection-description": ("产品", "精密检测", "精密的检测仪器是制造中走丝 机床的必备。"),
    "inspection-laser": ("产品", "精密检测", "激光干涉"),
    "inspection-vision": ("产品", "精密检测", "影像仪"),
    "inspection-coordinate": ("产品", "精密检测", "三坐标"),
    "inspection-ballbar": ("产品", "精密检测", "球杆仪"),
    "inspection-main": ("产品", "精密检测", "1"),
    "electrical-card-background": ("产品", "先进制造背景图 拷贝 2"),
    "electrical-bench": ("产品", "电气装配", "电气"),
    "electrical-cabinet": ("产品", "电气装配", "电柜"),
    "electrical-title": ("产品", "电气装配", "电气装配"),
    "electrical-description": ("产品", "电气装配", "用现代协同配送模式代替传统 手工组装：料库根据信息主动 将物料配送到工位"),
    "warehouse-title": ("产品", "立库", "智能物料仓储"),
    "warehouse-image": ("产品", "立库", "立库"),
    "equipment-title": ("产品", "生产设备图片", "生产核心设备"),
    "equipment-1": ("产品", "生产设备图片", "5台平面磨床"),
    "equipment-2": ("产品", "生产设备图片", "大隈立加"),
    "equipment-3": ("产品", "生产设备图片", "0崴力双排"),
    "equipment-4": ("产品", "生产设备图片", "北一大隈2"),
}


def main():
    psd = PSDImage.open(SOURCE)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for output_name, path in LAYERS.items():
        layer = find_layer(psd, path)
        image = layer.composite()
        if image is None:
            raise RuntimeError(f"No pixels for {'/'.join(path)}")
        destination = OUTPUT / f"{output_name}.png"
        image.save(destination)
        print(f"{output_name}: {layer.bbox}")


if __name__ == "__main__":
    main()
