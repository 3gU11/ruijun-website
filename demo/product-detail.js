const modelList = document.querySelector('[data-product-models]');
const seriesCode = new URLSearchParams(window.location.search).get('series') || '';
const parameterLabels = Object.freeze({
  xyTravelMm: '工作台行程（X × Y）', zAxisTravelMm: 'Z 轴行程', maxWorkpieceMm: '最大工件尺寸',
  maxWorkpieceWeightKg: '最大工件重量（kg）', maxCuttingHeightMm: '最大切割高度（mm）',
  maxTaperDegrees: '最大锥度（度）', machineDimensionsMm: '机床外形尺寸', machineWeightKg: '机床重量（kg）'
});

function setModelStatus(message) {
  if (!modelList) return;
  modelList.replaceChildren();
  const status = document.createElement('p');
  status.className = 'catalog-status';
  status.textContent = message;
  modelList.append(status);
}

function modelCard(model) {
  const card = document.createElement('article');
  card.className = 'product-model-card';
  const title = document.createElement('h2');
  title.textContent = model.name;
  const code = document.createElement('p');
  code.className = 'product-model-code';
  code.textContent = model.model_code;
  const parameters = document.createElement('dl');
  for (const [key, label] of Object.entries(parameterLabels)) {
    if (model.parameters?.[key] === undefined || model.parameters[key] === null) continue;
    const term = document.createElement('dt');
    term.textContent = label;
    const definition = document.createElement('dd');
    definition.textContent = String(model.parameters[key]);
    parameters.append(term, definition);
  }
  card.append(title, code, parameters);
  return card;
}

async function loadModels() {
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(seriesCode)) {
    setModelStatus('请选择已发布的产品系列后查看型号资料。');
    return;
  }
  try {
    const response = await fetch(`/api/public/v1/product-models?series=${encodeURIComponent(seriesCode)}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Product model API responded ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.data) || payload.data.length === 0) {
      setModelStatus('该系列的型号资料正在审核中，欢迎通过服务支持页面联系瑞钧获取选型建议。');
      return;
    }
    modelList.replaceChildren(...payload.data.map(modelCard));
  } catch {
    setModelStatus('型号资料暂时不可用，请稍后重试或通过服务支持页面联系瑞钧。');
  }
}

loadModels();
