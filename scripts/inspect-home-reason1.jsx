#target photoshop

(function () {
  var source = new File('D:/CURSORpj/gaunwang/素材/网站主页/新网站首页.psd');
  var output = new File('D:/CURSORpj/gaunwang/output/home-reason1-layers.json');
  var documentRef = app.open(source);
  var records = [];

  function px(value) {
    return value && value.as ? value.as('px') : Number(value);
  }

  function visit(container, path) {
    for (var index = 0; index < container.layers.length; index += 1) {
      var layer = container.layers[index];
      var currentPath = path ? path + '/' + layer.name : layer.name;
      var bounds = layer.bounds;
      var record = {
        path: currentPath,
        name: layer.name,
        kind: layer.typename,
        visible: layer.visible,
        bounds: [px(bounds[0]), px(bounds[1]), px(bounds[2]), px(bounds[3])]
      };
      if (layer.typename === 'ArtLayer' && layer.kind === LayerKind.TEXT) {
        record.text = layer.textItem.contents;
        record.font = layer.textItem.font;
        record.size = px(layer.textItem.size);
        record.position = [px(layer.textItem.position[0]), px(layer.textItem.position[1])];
      }
      records.push(record);
      if (layer.typename === 'LayerSet') visit(layer, currentPath);
    }
  }

  visit(documentRef, '');
  output.parent.create();
  output.encoding = 'UTF8';
  output.open('w');
  output.write(JSON.stringify({ width: px(documentRef.width), height: px(documentRef.height), records: records }, null, 2));
  output.close();
  documentRef.close(SaveOptions.DONOTSAVECHANGES);
}());
