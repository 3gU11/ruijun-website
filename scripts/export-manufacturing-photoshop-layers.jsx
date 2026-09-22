function px(value) { return Math.round(value.as('px')); }

function getLayer(path) {
  var names = path.split('/');
  var layers = app.activeDocument.layers;
  var layer;
  for (var i = 0; i < names.length; i++) {
    layer = layers.getByName(names[i]);
    layers = layer.layers;
  }
  return layer;
}

function exportLayer(path, fileName) {
  var source = app.activeDocument;
  var layer = getLayer(path);
  var bounds = layer.bounds;
  var left = px(bounds[0]);
  var top = px(bounds[1]);
  var width = px(bounds[2]) - left;
  var height = px(bounds[3]) - top;
  var target = app.documents.add(UnitValue(width, 'px'), UnitValue(height, 'px'), 72, fileName, NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
  app.activeDocument = source;
  var copy = layer.duplicate(target, ElementPlacement.PLACEATBEGINNING);
  app.activeDocument = target;
  copy.translate(-left, -top);
  var png = new PNGSaveOptions();
  png.interlaced = false;
  target.saveAs(new File('D:/CURSORpj/gaunwang/demo/assets/manufacturing-psd/layers/' + fileName + '.png'), png, true, Extension.LOWERCASE);
  target.close(SaveOptions.DONOTSAVECHANGES);
  app.activeDocument = source;
}

var layerList = [
  ['产品/BANNER/大楼1', 'hero-building'],
  ['产品/BANNER/矩形 9', 'hero-panel'],
  ['产品/BANNER/World’s top class production process ', 'hero-process-copy'],
  ['产品/BANNER/年产量可达10000台', 'hero-output-copy'],
  ['产品/BANNER/装配车间1', 'hero-production-image'],
  ['产品/先进制造背景图', 'cnc-card-background'],
  ['产品/CNC车间/大隈龙门', 'cnc-gantry-main'],
  ['产品/CNC车间/大隈卧加', 'cnc-horizontal'],
  ['产品/CNC车间/导轨磨', 'cnc-rail-grinder'],
  ['产品/CNC车间/建德磨床', 'cnc-surface-grinder'],
  ['产品/CNC车间/大隈立加', 'cnc-vertical'],
  ['产品/CNC车间/威力龙门', 'cnc-gantry-small'],
  ['产品/CNC车间/CNC车间', 'cnc-title'],
  ['产品/CNC车间/自动化数控设备替代了传统的机械加工， 拥有 100 多台套加工母机', 'cnc-description'],
  ['产品/CNC车间/核心设备： 五面体龙门、五轴数控、立式、卧式等 各类加工中心、平面磨床、导轨磨床', 'cnc-detail'],
  ['产品/钣金车间/钣金车间', 'metal-title'],
  ['产品/钣金车间/集成先进的信息技术、自动化设备和工业软件， 实现生产过程的高效、精准、透明和柔性。', 'metal-description'],
  ['产品/钣金车间/智能核心设备：智能下料单元、智能成型单元、 智能焊接与连接单元、静电喷涂产线', 'metal-detail'],
  ['产品/钣金车间/折弯中心', 'metal-bending-center'],
  ['产品/钣金车间/激光', 'metal-laser'],
  ['产品/钣金车间/折弯', 'metal-bending'],
  ['产品/钣金车间/喷涂', 'metal-coating'],
  ['产品/先进制造背景图 拷贝', 'assembly-card-background'],
  ['产品/装配车间/装配车间3', 'assembly-main'],
  ['产品/装配车间/装配车间2', 'assembly-detail-image'],
  ['产品/装配车间/装配车间', 'assembly-title'],
  ['产品/装配车间/装配体系依托于恒温洁净的作业 环境，部署了20条全链路制程产 线。实现MES系统全流程智能化 管控.', 'assembly-description'],
  ['产品/精密检测/精密检测', 'inspection-title'],
  ['产品/精密检测/精密的检测仪器是制造中走丝 机床的必备。', 'inspection-description'],
  ['产品/精密检测/激光干涉', 'inspection-laser'],
  ['产品/精密检测/影像仪', 'inspection-vision'],
  ['产品/精密检测/三坐标', 'inspection-coordinate'],
  ['产品/精密检测/球杆仪', 'inspection-ballbar'],
  ['产品/精密检测/1', 'inspection-main'],
  ['产品/先进制造背景图 拷贝 2', 'electrical-card-background'],
  ['产品/电气装配/电气', 'electrical-bench'],
  ['产品/电气装配/电柜', 'electrical-cabinet'],
  ['产品/电气装配/电气装配', 'electrical-title'],
  ['产品/电气装配/用现代协同配送模式代替传统 手工组装：料库根据信息主动 将物料配送到工位', 'electrical-description'],
  ['产品/立库/智能物料仓储', 'warehouse-title'],
  ['产品/立库/立库', 'warehouse-image'],
  ['产品/生产设备图片/生产核心设备', 'equipment-title'],
  ['产品/生产设备图片/5台平面磨床', 'equipment-1'],
  ['产品/生产设备图片/大隈立加', 'equipment-2'],
  ['产品/生产设备图片/0崴力双排', 'equipment-3'],
  ['产品/生产设备图片/北一大隈2', 'equipment-4']
];

for (var i = 0; i < layerList.length; i++) exportLayer(layerList[i][0], layerList[i][1]);
'Exported ' + layerList.length + ' manufacturing layers.';
