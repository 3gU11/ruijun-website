const productSeriesGrid = document.querySelector('[data-product-series]');

function setCatalogStatus(message) {
  if (!productSeriesGrid) return;
  productSeriesGrid.replaceChildren();
  const status = document.createElement('p');
  status.className = 'catalog-status';
  status.textContent = message;
  productSeriesGrid.append(status);
}

function buildSeriesCard(series, index) {
  const card = document.createElement('a');
  card.className = 'catalog-item catalog-item-cms';
  card.href = `/product/detail/?series=${encodeURIComponent(series.series_code)}`;
  const copy = document.createElement('div');
  copy.className = 'catalog-item-copy';
  const sequence = document.createElement('small');
  sequence.textContent = `${String(index + 1).padStart(2, '0')} / PRODUCT SERIES`;
  const title = document.createElement('h2');
  title.textContent = series.name;
  const positioning = document.createElement('p');
  positioning.className = 'catalog-item-positioning';
  positioning.textContent = series.positioning || '产品资料已发布，具体配置请联系瑞钧。';
  copy.append(sequence, title, positioning);
  card.append(copy);
  return card;
}

async function loadProductSeries() {
  if (!productSeriesGrid) return;
  try {
    const response = await fetch('/api/public/v1/product-series', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Product API responded ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.data) || payload.data.length === 0) {
      setCatalogStatus('产品资料正在审核中，欢迎通过服务支持页面联系瑞钧获取选型建议。');
      return;
    }
    productSeriesGrid.replaceChildren(...payload.data.map(buildSeriesCard));
  } catch {
    setCatalogStatus('产品资料暂时不可用，请稍后重试或通过服务支持页面联系瑞钧。');
  }
}

loadProductSeries();
