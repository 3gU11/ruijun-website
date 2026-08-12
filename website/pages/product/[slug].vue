<script setup lang="ts">
import { filterProductModels } from '~/shared/product-model-filter.mjs';

type ProductRecord = {
  name?: string;
  model_code?: string;
  parameters?: Record<string, unknown>;
  resources?: Array<{ title: string; type?: string; url: string }>;
  case_studies?: Array<{ title: string; summary?: string; url: string }>;
  media?: Array<{ path: string; alt?: string }>;
  cover_asset?: string | null;
};

const route = useRoute();
const slug = computed(() => String(route.params.slug || ''));
const productEndpoint = computed(() => slug.value
  ? `/api/public/v1/products/${encodeURIComponent(slug.value)}`
  : '/api/public/v1/products');
const { data: response, error: responseError } = await useFetch(productEndpoint, {
  watch: [slug],
  default: () => ({ data: null as ProductRecord | null, source: 'static', cache: 'unavailable' })
});
const { data: seriesResponse } = await useFetch('/api/public/v1/product-series', {
  default: () => ({ data: [] as Array<{ series_code?: string; name?: string }> })
});

if (responseError.value?.statusCode === 410) {
  throw createError({ statusCode: 410, statusMessage: 'Product is no longer published', fatal: true });
}

const product = computed<ProductRecord | null>(() => {
  const data = response.value?.data;
  return Array.isArray(data) ? data[0] || null : data || null;
});
const modelQuery = ref('');
const publicModels = computed(() => {
  const data = response.value?.data;
  return Array.isArray(data) ? data : [];
});
const filteredModels = computed(() => filterProductModels(publicModels.value, modelQuery.value));
const seriesNames = computed(() => new Map((Array.isArray(seriesResponse.value?.data) ? seriesResponse.value.data : [])
  .filter((series) => series?.series_code)
  .map((series) => [String(series.series_code), String(series.name || series.series_code)])));

const productCards = [
  { id: 'workstation', index: '01', category: '无人化加工', name: '灵动工作站', model: 'Smart workstation', image: '/assets/psd/product-workstation.png' },
  { id: 'auto', index: '02', category: '自动穿丝系列', name: 'FR-XS(Auto)', model: 'Automatic threading', image: '/assets/psd/product-auto.png' },
  { id: 'pro', index: '03', category: '高速切割系列', name: 'FR-XS(Pro)', model: 'High-speed cutting', image: '/assets/psd/product-pro.png' },
  { id: 'ft', index: '04', category: '一体机系列', name: 'FT-XS', model: 'Integrated series', image: '/assets/psd/product-ft-xs.png' },
  { id: 'fr-y', index: '05', category: '大摇摆系列', name: 'FR-Y', model: 'Large taper series', image: '/assets/psd/product-fr-y.png' },
  { id: 'fl', index: '06', category: '重大型系列', name: 'FL-XS', model: 'Heavy-duty series', image: '/assets/psd/product-fl-xs.png' }
] as const;

const modelOptions = ['FR400XS(Pro)', 'FR500XS(Pro)', 'FR600XS(Pro)', 'FR7055XS(Pro)', 'FR8055XS(Pro)', 'FR8060XS(Pro)'];
const seriesModelOptions = {
  workstation: ['RJ500', 'RJ600', 'RJ700'],
  auto: ['FR400XS(Pro)', 'FR500XS(Pro)', 'FR600XS(Pro)', 'FR7055XS(Pro)', 'FR8055XS(Pro)', 'FR8060XS(Pro)'],
  pro: ['FR400XS(Pro)', 'FR500XS(Pro)', 'FR600XS(Pro)'],
  ft: ['FT400XS', 'FT500XS', 'FT600XS'],
  'fr-y': ['FR-Y400', 'FR-Y500', 'FR-Y600'],
  fl: ['FL600XS', 'FL800XS', 'FL1000XS']
} as const;
const selectedCard = ref<(typeof productCards)[number]['id']>('auto');
const selectedModel = ref(product.value?.model_code || 'FR7055XS(Pro)');
const selectedReason = ref(0);
const detailsOpen = ref(false);
const parameterPage = ref(0);
const parametersPerPage = 4;
let proofFrame = 0;
let overviewEntryFrame = 0;

const activeCard = computed(() => productCards.find((card) => card.id === selectedCard.value) || productCards[0]);
const activeModelOptions = computed(() => seriesModelOptions[activeCard.value.id]);
const isCurrentProduct = computed(() => activeCard.value.id === 'auto');
const displayName = computed(() => isCurrentProduct.value ? product.value?.name || activeCard.value.name : activeCard.value.name);
const displayModel = computed(() => isCurrentProduct.value ? product.value?.model_code || selectedModel.value : activeCard.value.name);
const displayImage = computed(() => isCurrentProduct.value
  ? '/assets/psd/product-fr7055-transparent.png'
  : activeCard.value.image);
const displayImageAlt = computed(() => isCurrentProduct.value ? product.value?.media?.[0]?.alt || `${displayName.value} 机床设备` : `${displayName.value} 机床设备`);
const featureReasons = [
  { label: '自适应切割功能', title: '自适应切割功能', detail: '根据加工状态调整切割策略，提升复杂工件加工的稳定性。', image: '/assets/psd/features/feature-adaptive.png' },
  { label: '效率提升50%', title: '效率提升50%', detail: '在适用工况下提升加工节拍与生产效率。', image: '/assets/psd/features/feature-efficiency.png' },
  { label: '屏显手持单元', title: '屏显手持单元', detail: '通过手持控制单元进行现场操作与状态查看。', image: '/assets/psd/features/feature-handheld.png' }
];
const fallbackParameters = [
  ['机床型号', 'FR7055XS'],
  ['X,Y,Z轴行程', '700*550*400'],
  ['U,V轴行程', '± 40'],
  ['最佳表面粗糙度', 'Ra≤0.8~1.0 μm（多次切割）Multi-cutting'],
  ['多次切割精度', '± 0.005mm（12mm*12mm*30mm 对边六角 Regular hexagon）'],
  ['最大工件重量', '1000KG'],
  ['机床重量', '≈ 3250KG'],
  ['X,Y,U,V轴驱动', '四轴交流伺服 4axis Servo'],
  ['储液箱容量', '≈ 180L'],
  ['过滤方式', '双泵强压单滤循环系统 Double pump filtration'],
  ['电源输入规格', '220V / 380V 50~60Hz'],
  ['总电气功率', '3KVA']
];
const specificationRows = computed(() => fallbackParameters);
const parameterPageCount = computed(() => activeModelOptions.value.length);
const visibleSpecificationRows = computed(() => specificationRows.value);
const resources = computed(() => product.value?.resources || []);
const caseStudies = computed(() => product.value?.case_studies || []);

function openProduct(id: (typeof productCards)[number]['id']) {
  selectedCard.value = id;
  selectedModel.value = seriesModelOptions[id][0];
  selectedReason.value = 0;
  parameterPage.value = 0;
  detailsOpen.value = true;
}

function chooseModel(model: string) {
  selectedModel.value = model;
  parameterPage.value = Math.max(0, activeModelOptions.value.indexOf(model as never));
}

function closeProduct() {
  detailsOpen.value = false;
}

function changeParameterPage(direction: -1 | 1) {
  parameterPage.value = Math.max(0, Math.min(parameterPageCount.value - 1, parameterPage.value + direction));
  selectedModel.value = activeModelOptions.value[parameterPage.value];
}

function onDialogKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeProduct();
}

onMounted(() => window.addEventListener('keydown', onDialogKeydown));
onMounted(() => {
  const overview = document.querySelector<HTMLElement>('.product-overview');
  const proofNodes = [...document.querySelectorAll<HTMLElement>('.proof-grid article strong')];
  overviewEntryFrame = requestAnimationFrame(() => {
    overviewEntryFrame = requestAnimationFrame(() => overview?.classList.add('is-entered'));
  });
  const targets = [50, 30, 1];
  const durations = [1500, 1500, 3000];
  const startedAt = performance.now();
  proofNodes[2]?.replaceChildren(document.createTextNode('NO.0'));
  const animateProof = (now: number) => {
    const elapsed = now - startedAt;
    proofNodes.forEach((node, index) => {
      const progress = Math.min(1, elapsed / durations[index]);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(targets[index] * eased);
      if (index === 1) {
        const numberNode = [...node.childNodes].find((child) => child.nodeType === Node.TEXT_NODE);
        if (numberNode) numberNode.textContent = `${value} `;
      } else {
        node.textContent = index === 2 ? `NO.${value}` : `${value}%`;
      }
    });
    if (elapsed < Math.max(...durations)) proofFrame = requestAnimationFrame(animateProof);
  };
  proofFrame = requestAnimationFrame(animateProof);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onDialogKeydown);
  cancelAnimationFrame(proofFrame);
  cancelAnimationFrame(overviewEntryFrame);
});
useSeoMeta({
  title: () => slug.value ? `${displayName.value} 产品详情` : '产品中心',
  description: () => slug.value ? `${displayName.value} 的产品配置、特点与公开技术参数。` : '瑞钧智科中走丝线切割机床产品中心、设备特点与技术参数。'
});
</script>

<template>
  <main class="product-detail-page">
    <SiteHeader />

    <section class="product-overview" aria-labelledby="product-overview-title">
      <div class="overview-heading">
        <p class="eyebrow">PRODUCT CENTER</p>
        <h1 id="product-overview-title">Product <span>产品中心</span></h1>
      </div>
      <div class="overview-kicker" aria-hidden="true"><b>3+</b><span>选择瑞钧理由</span></div>
      <div class="proof-grid">
        <article><strong>50%</strong><span>产品效率性能提升</span></article>
        <article><strong>30 <em>YEARS</em></strong><span>30年技术沉淀，先进智造工厂</span></article>
        <article><strong>NO.1</strong><span>产品销量稳居全国第一<small>（数据来源电加工协会）</small></span></article>
      </div>
    </section>

    <section class="catalog-section" aria-labelledby="catalog-title">
      <h2 id="catalog-title" class="sr-only">产品系列</h2>
      <div class="product-grid">
        <button v-for="family in productCards" :key="family.id" type="button" class="product-card" :aria-expanded="detailsOpen && selectedCard === family.id" @click="openProduct(family.id)">
          <img :src="family.image" :alt="`${family.name} 产品图`">
          <span class="product-copy"><span class="product-kicker">{{ family.index.replace(/^0/, '') }}/{{ family.category }}</span><span class="product-name">{{ family.name }}</span></span>
        </button>
      </div>
      <section v-if="detailsOpen" class="product-series-panel" :aria-label="`${activeCard.name} 系列机型与技术参数`">
        <button class="series-panel-close" type="button" aria-label="收起机型详情" @click="closeProduct">×</button>
        <div class="series-panel-main">
          <nav class="series-model-list" aria-label="该系列机型">
            <button v-for="model in activeModelOptions" :key="model" type="button" :class="{ active: selectedModel === model }" @click="chooseModel(model)">{{ model }}</button>
          </nav>
          <div class="series-machine-visual"><img :src="displayImage" :alt="displayImageAlt"></div>
          <div class="series-capabilities" aria-label="核心能力">
            <button v-for="(reason, index) in featureReasons" :key="reason.label" type="button" :class="{ active: selectedReason === index }" @click="selectedReason = index"><img :src="reason.image" alt=""><span>{{ index + 1 }}.{{ reason.label }}</span></button>
          </div>
        </div>
        <section class="series-specification" aria-labelledby="series-specification-title">
          <div class="specification-side-label"><span id="series-specification-title"><img src="/assets/psd/technical-label-psd.png" alt="技术参数"></span></div>
          <div class="specification-table"><img src="/assets/psd/technical-parameters-psd.png" alt="FR7055XS 技术参数表"></div>
          <div class="specification-drawings" aria-label="机型工程视图"><img src="/assets/psd/product-dimensions.png" alt="FR400 机型俯视图与正视图"></div>
        </section>
        <nav class="specification-pager" aria-label="技术参数型号翻页"><button type="button" :disabled="parameterPage === 0" @click="changeParameterPage(-1)">‹ 上页</button><span>{{ parameterPage + 1 }} / {{ parameterPageCount }}</span><button type="button" :disabled="parameterPage >= parameterPageCount - 1" @click="changeParameterPage(1)">下页 ›</button></nav>
      </section>
    </section>

    <Teleport to="body">
      <div v-if="false" class="product-dialog-backdrop" role="presentation" @click.self="closeProduct">
        <section class="product-dialog" role="dialog" aria-modal="true" :aria-labelledby="'dialog-title-' + selectedCard">
          <button class="dialog-close" type="button" aria-label="关闭产品详情" @click="closeProduct">×</button>
          <div class="dialog-main">
            <div class="dialog-product-picker" aria-label="产品选择">
              <button v-for="card in productCards" :key="card.id" type="button" :class="{ active: selectedCard === card.id }" :aria-label="`查看${card.name}`" @click="selectedCard = card.id">
                <img :src="card.image" alt="">
                <span>{{ card.name }}</span>
              </button>
            </div>
            <div class="dialog-product-visual">
              <p>PRODUCT CENTER</p>
              <h2 :id="'dialog-title-' + selectedCard">{{ displayName }}</h2>
              <span>{{ displayModel }}</span>
              <img :src="displayImage" :alt="displayImageAlt">
              <div class="dialog-model-options" aria-label="型号选择"><button v-for="model in modelOptions" :key="model" type="button" :class="{ active: selectedModel === model }" @click="chooseModel(model)">{{ model }}</button></div>
            </div>
            <div class="dialog-capabilities">
              <button v-for="(reason, index) in featureReasons" :key="reason.label" type="button" :aria-pressed="selectedReason === index" :class="{ active: selectedReason === index }" @click="selectedReason = index">
                <img :src="reason.image" alt="" aria-hidden="true"><span>{{ index + 1 }}. {{ reason.label }}</span><small>{{ reason.detail }}</small>
              </button>
            </div>
          </div>
          <section v-if="!slug" class="dialog-model-search" aria-labelledby="dialog-model-search-title">
            <div>
              <p class="eyebrow">MODEL SEARCH</p>
              <h3 id="dialog-model-search-title">按型号查找设备</h3>
            </div>
            <label class="model-search-input"><span class="sr-only">搜索型号</span><input v-model="modelQuery" type="search" placeholder="输入型号、系列或名称" autocomplete="off"></label>
            <div class="product-model-results" aria-live="polite">
              <NuxtLink v-for="model in filteredModels" :key="model.model_code" :to="model.slug ? `/product/${encodeURIComponent(model.slug)}` : '/product'" class="model-result">
                <span>{{ model.model_code }}</span><strong>{{ model.name || seriesNames.get(String(model.series_code)) || model.model_code }}</strong><b aria-hidden="true">→</b>
              </NuxtLink>
              <p v-if="!filteredModels.length" class="model-search-empty">没有找到匹配的已发布型号。</p>
            </div>
          </section>
          <div class="dialog-specification">
            <div class="dialog-spec-label"><span>01</span><b>技术参数</b></div>
            <div><h3>{{ displayModel }}</h3><dl><template v-for="[key, value] in specificationRows" :key="String(key)"><dt>{{ key }}</dt><dd>{{ value }}</dd></template></dl></div>
            <div class="dialog-spec-drawing"><strong>{{ displayModel.split('(')[0] }}</strong><img :src="displayImage" :alt="displayImageAlt"></div>
          </div>
        </section>
      </div>
    </Teleport>

    <section v-if="resources.length || caseStudies.length" class="product-resources" aria-label="产品资料">
      <article v-if="resources.length"><p class="eyebrow">PRODUCT RESOURCES</p><a v-for="resource in resources" :key="resource.url" :href="resource.url" :target="resource.url.startsWith('https://') ? '_blank' : undefined" :rel="resource.url.startsWith('https://') ? 'noreferrer' : undefined"><span>{{ resource.type || '资料' }}</span><strong>{{ resource.title }}</strong><b aria-hidden="true">-></b></a></article>
      <article v-if="caseStudies.length"><p class="eyebrow">APPLICATION CASES</p><a v-for="caseStudy in caseStudies" :key="caseStudy.url" :href="caseStudy.url" :target="caseStudy.url.startsWith('https://') ? '_blank' : undefined" :rel="caseStudy.url.startsWith('https://') ? 'noreferrer' : undefined"><strong>{{ caseStudy.title }}</strong><span v-if="caseStudy.summary">{{ caseStudy.summary }}</span><b aria-hidden="true">-></b></a></article>
    </section>

    <SiteFooter variant="full" />
  </main>
</template>

<style scoped>
.product-overview .overview-heading,.product-overview.is-entered .overview-heading{opacity:1;transform:none;transition:none}.product-overview .proof-grid article{opacity:0;transform:translate3d(0,38px,0) rotate(-8deg);transform-origin:100% 100%;will-change:transform,opacity;transition:opacity .72s ease,transform .96s cubic-bezier(.22,.8,.24,1)}.product-overview.is-entered .proof-grid article{opacity:1;transform:translate3d(0,0,0) rotate(0)}.product-overview.is-entered .proof-grid article:nth-child(1){transition-delay:.18s}.product-overview.is-entered .proof-grid article:nth-child(2){transition-delay:.34s}.product-overview.is-entered .proof-grid article:nth-child(3){transition-delay:.5s}
.product-detail-page { overflow: hidden; background: #f3f3f2; color: #302f2f; font-family: var(--ruijun-font-cn); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.eyebrow { margin: 0; color: #e51b23; font-family: var(--ruijun-font-latin); font-size: 12px; font-weight: 700; letter-spacing: .1em; }
.product-overview { position: relative; min-height: 555px; padding: 150px max(6.2%, calc((100% - 1400px) / 2)) 64px; overflow: hidden; background: #f4f4f3; }
.dialog-model-search { display: grid; grid-template-columns: minmax(180px, .55fr) minmax(230px, .8fr) minmax(300px, 1.4fr); gap: 24px; align-items: end; margin: 0 56px; padding: 12px 0 34px; border-top: 1px solid #303030; }
.dialog-model-search h3 { margin: 8px 0 0; color: #fff; font-size: 24px; line-height: 1.15; }
.model-search-input input { width: 100%; padding: 14px 16px; color: #191a1b; background: #fff; border: 1px solid #c7c9c6; border-radius: 3px; font: inherit; }
.model-search-input input:focus { outline: 2px solid #e51b23; outline-offset: 2px; }
.product-model-results { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-top: 1px solid #494949; }
.model-result { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 12px 0 12px 14px; color: #dedede; border-bottom: 1px solid #373737; text-decoration: none; }
.model-result:hover strong { color: #e51b23; }
.model-result span { color: #e51b23; font-family: var(--ruijun-font-latin); font-size: 12px; }
.model-result strong { overflow: hidden; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.model-result b { padding: 0 12px; color: #e51b23; font-weight: 400; }
.model-search-empty { grid-column: 1 / -1; margin: 0; padding: 16px 0; color: #767a7c; font-size: 14px; }
.product-overview::after { position: absolute; top: 92px; right: -155px; width: 420px; height: 225px; border: 4px dashed #fb2027; border-left: 0; border-bottom: 0; border-radius: 0 500px 0 0; content: ''; opacity: .85; transform: rotate(20deg); }
.overview-heading h1 { margin: 17px 0 0; color: #000; font-family: Arial, sans-serif; font-size: clamp(42px, 4.1vw, 68px); font-weight: 500; line-height: 1; }
.overview-heading h1 span { margin-left: .35em; color: #fe0a0a; font-family: var(--ruijun-font-cn); font-size: .6em; font-weight: 600; }
.overview-kicker { position: absolute; top: 150px; right: max(6.2%, calc((100% - 1400px) / 2)); display: grid; gap: 6px; color: #777; text-align: right; }
.overview-kicker b { color: #fe0a0a; font-size: 30px; font-weight: 500; }
.overview-kicker span { font-size: 20px; }
.proof-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 26px; max-width: 1400px; margin: 145px auto 0; text-align: center; }
.proof-grid article { display: grid; gap: 14px; justify-items: center; }
.proof-grid strong { color: #fe0a0a; font-family: Arial, sans-serif; font-size: clamp(30px, 3.4vw, 54px); font-weight: 500; line-height: 1; }
.proof-grid strong em { font-size: .58em; font-style: normal; }
.proof-grid span { color: #302f2f; font-size: clamp(17px, 1.4vw, 24px); }
.proof-grid small { display: block; margin-top: 5px; color: #848282; font-size: .54em; }
.catalog-section { padding: 0 max(6.2%, calc((100% - 1400px) / 2)) 76px; background: #f4f4f3; }
.product-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; max-width: 1400px; margin: 0 auto; }
.product-card { position: relative; aspect-ratio: 420 / 259; min-height: 0; padding: 0; overflow: hidden; color: #fff; background: #dbe1e3; border: 0; border-radius: 0; cursor: pointer; text-align: left; transition: transform .35s cubic-bezier(.22,.8,.24,1), box-shadow .35s ease; }
.product-card:hover { z-index: 1; transform:translateY(-5px); box-shadow:0 16px 30px rgb(24 32 34 / 16%); }
.product-card img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transition:transform .7s cubic-bezier(.22,.8,.24,1); }
.product-card:hover img { transform:scale(1.035); }
.product-copy { position:absolute; z-index:1; top:50%; right:0; display:grid; align-content:center; gap:8px; width:35%; min-height:42%; padding:18px 20px; color:#fff; background:rgb(63 65 66 / 74%); transform:translateY(-50%); }
.product-kicker { color:#13c7e8; font-size:clamp(11px,.78vw,15px); line-height:1.2; }
.product-name { color:#fff; font-size:clamp(18px,1.25vw,24px); font-weight:500; line-height:1.18; }
.product-series-panel { position:relative; max-width:1400px; margin:54px auto 0; padding:64px 72px 48px; background:#e8e8e9; border-radius:26px; }
.series-panel-close { position:absolute; top:-23px; left:50%; display:grid; width:46px; height:46px; place-items:center; padding:0; color:#fff; background:#f1373b; border:0; border-radius:50%; cursor:pointer; font-family:Arial,sans-serif; font-size:40px; line-height:1; transform:translateX(-50%); }
.series-panel-main { display:grid; grid-template-columns:190px minmax(0,1fr) 155px; min-height:408px; gap:48px; align-items:center; }
.series-model-list { display:grid; align-content:center; gap:14px; }
.series-model-list button { min-height:46px; padding:0 16px; color:#f5f5f5; background:#5d5e60; border:0; border-radius:5px; cursor:pointer; font-family:var(--ruijun-font-latin); font-size:15px; text-align:left; transition:background .2s ease,transform .2s ease; }
.series-model-list button:hover,.series-model-list button.active { background:#8c8d8f; transform:translateX(4px); }
.series-machine-visual { position:relative; display:grid; min-width:0; min-height:370px; place-items:center; }
.series-machine-visual img { width:min(100%,620px); max-height:350px; object-fit:contain; }
.series-capabilities { display:grid; align-content:center; justify-items:center; gap:16px; }
.series-capabilities button { position:relative; display:grid; justify-items:center; gap:7px; padding:0; color:#1d32b2; background:transparent; border:0; cursor:pointer; font-size:12px; line-height:1.2; text-align:center; }
.series-capabilities img { width:112px; height:100px; object-fit:cover; border-radius:17px; filter:grayscale(.08); }
.series-capabilities button.active img,.series-capabilities button:hover img { outline:2px solid #2549c8; outline-offset:2px; }
.series-specification { display:grid; grid-template-columns:52px minmax(0,1fr) 230px; gap:34px; align-items:start; margin-top:36px; padding:44px 46px 36px; background:#dedfe1; border:0; border-radius:8px; }
.specification-side-label { display:flex; justify-content:center; padding-top:14px; }
.specification-side-label span { display:block; width:34px; min-height:0; padding:0; background:transparent; border-radius:0; }
.specification-side-label img { display:block; width:100%; height:auto; }
.specification-table { display:flex; flex-direction:column; align-self:start; min-width:0; padding-top:2px; }
.specification-table > img { display:block; width:100%; height:auto; }
.specification-table dl { display:grid; grid-template-columns:minmax(122px,.78fr) minmax(0,1.55fr); gap:11px 24px; margin:0; }
.specification-table dt { color:#4e5154; font-size:12px; line-height:1.25; text-align:right; }
.specification-table dd { margin:0; color:#4c4f53; font-family:var(--ruijun-font-latin); font-size:12px; line-height:1.25; }
.specification-table p { margin:24px 0 0; color:#6a6c70; font-size:8px; line-height:1.45; }
.specification-drawings { min-width:0; padding-top:2px; }
.specification-drawings img { display:block; width:100%; height:auto; }
.specification-pager { display:flex; justify-content:center; align-items:center; gap:18px; margin:0 -72px -48px; padding:28px 0 30px; color:#5a5d60; background:#f4f4f3; font-family:var(--ruijun-font-latin); font-size:13px; }.specification-pager button { min-width:76px; padding:9px 13px; color:#fff; background:#225da8; border:0; border-radius:3px; cursor:pointer; font-size:14px; line-height:1; }.specification-pager button:disabled { cursor:not-allowed; opacity:.3; }
.machine-showcase { display: grid; grid-template-columns: 190px minmax(0, 1fr) 205px; gap: 36px; max-width: 1400px; min-height: 575px; margin: 0 auto; padding: 65px 52px; background: #e7e7e9; border-radius: 8px; }
.model-list { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 13px; }
.model-list button { min-width: 136px; padding: 10px 14px; color: #f0eeee; background: #565656; border: 0; border-radius: 4px; cursor: pointer; font-family: var(--ruijun-font-latin); font-size: 13px; text-align: left; transition: background .2s ease, color .2s ease; }
.model-list button:hover, .model-list button.active { color: #fff; background: #e51b23; }
.machine-visual { position: relative; display: grid; place-items: center; min-width: 0; }
.machine-visual img { width: min(100%, 650px); max-height: 420px; object-fit: contain; }
.machine-copy { position: absolute; top: 0; left: 0; z-index: 1; display: grid; gap: 4px; }
.machine-copy p { margin: 0; color: #e51b23; font-size: 11px; letter-spacing: .12em; }
.machine-copy h2 { margin: 0; color: #2a2929; font-size: clamp(26px, 2.7vw, 42px); line-height: 1.05; }
.machine-copy span { color: #68686a; font-family: var(--ruijun-font-latin); font-size: 14px; }
.feature-list { display: grid; align-content: center; gap: 14px; }
.feature-list button { position: relative; display: grid; min-height: 114px; padding: 0; overflow: hidden; color: #070192; background: #27292c; border: 0; border-radius: 4px; cursor: pointer; text-align: center; }
.feature-list button::after { position: absolute; inset: 0; background: rgb(18 20 22 / 48%); content: ''; }
.feature-list button.active::after { background: rgb(229 27 35 / 18%); }
.feature-list img { width: 100%; height: 114px; object-fit: cover; }
.feature-list span { position: absolute; z-index: 1; right: 8px; bottom: 8px; left: 8px; color: #fff; font-size: 11px; }
.specification-section { display: grid; grid-template-columns: 128px minmax(0, 1fr) minmax(280px, .85fr); gap: 44px; max-width: 1400px; margin: 0 auto 90px; padding: 65px 56px; background: #e7e7e9; border-radius: 8px; }
.specification-label { display: flex; align-items: flex-start; gap: 10px; color: #fff; }
.specification-label span { display: grid; width: 42px; height: 118px; place-items: center; background: #1757a8; border-radius: 20px; font-family: var(--ruijun-font-latin); font-size: 13px; writing-mode: vertical-rl; }
.specification-label b { color: #1757a8; font-size: 18px; writing-mode: vertical-rl; }
.specification-data h2 { margin: 0 0 26px; color: #3d3d3d; font-family: var(--ruijun-font-latin); font-size: 25px; }
.specification-data dl { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px 30px; margin: 0; font-size: 14px; }
.specification-data dt { color: #57575a; }
.specification-data dd { margin: 0; color: #2b2b2d; text-align: right; }
.specification-drawing { display: grid; align-content: center; justify-items: center; min-width: 0; }
.specification-drawing strong { align-self: start; color: #1757a8; font-family: var(--ruijun-font-latin); font-size: clamp(28px, 3vw, 46px); }
.specification-drawing img { width: 100%; max-height: 220px; object-fit: contain; }
.specification-drawing span { color: #68686a; font-size: 12px; text-align: center; }
.product-resources { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 42px; max-width: 1400px; margin: 0 auto 90px; }
.product-resources article { border-top: 1px solid #c8c8c6; }
.product-resources .eyebrow { padding-top: 18px; }
.product-resources a { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 3px 24px; padding: 18px 0; color: #302f2f; border-bottom: 1px solid #d6d6d4; text-decoration: none; }
.product-resources a:hover strong { color: #e51b23; }
.product-resources a span { color: #777; font-size: 13px; }
.product-resources a strong { font-size: 17px; }
.product-resources a b { grid-column: 2; grid-row: 1 / span 2; align-self: center; color: #e51b23; font-family: var(--ruijun-font-latin); }
.product-dialog-backdrop { position: fixed; z-index: 500; inset: 0; display: grid; place-items: center; padding: 82px 30px 30px; overflow-y: auto; background: rgb(243 243 242 / 78%); backdrop-filter: blur(5px); }
.product-dialog { position: relative; width: min(1240px, 100%); max-height: calc(100svh - 112px); overflow: auto; color: #fff; background: #090909; box-shadow: 0 28px 82px rgb(0 0 0 / 34%); }
.dialog-close { position: fixed; z-index: 1; top: max(32px, calc((100svh - min(1240px, 100vw - 60px)) / 2 - 29px)); left: 50%; display: grid; width: 58px; height: 58px; place-items: center; padding: 0; color: #fff; background: #ef111c; border: 0; border-radius: 50%; cursor: pointer; font-family: Arial, sans-serif; font-size: 42px; line-height: 1; transform: translateX(-50%); }
.dialog-close:hover { background: #ff2932; }
.dialog-main { display: grid; grid-template-columns: 112px minmax(0, 1.25fr) minmax(300px, .9fr); min-height: 530px; padding: 72px 56px 36px; gap: 34px; }
.dialog-product-picker { display: flex; flex-direction: column; justify-content: center; gap: 10px; }
.dialog-product-picker button { width: 100%; height: 58px; padding: 3px; overflow: hidden; background: #232323; border: 1px solid transparent; border-radius: 3px; cursor: pointer; }
.dialog-product-picker button:hover, .dialog-product-picker button.active { border-color: #ef111c; }
.dialog-product-picker img { width: 100%; height: 100%; object-fit: contain; }
.dialog-product-visual { position: relative; display: grid; align-content: center; justify-items: center; min-width: 0; }
.dialog-product-visual p { position: absolute; top: 0; left: 0; margin: 0; color: #ef111c; font-family: var(--ruijun-font-latin); font-size: 11px; letter-spacing: .12em; }
.dialog-product-visual h2 { position: absolute; top: 22px; left: 0; margin: 0; font-size: clamp(28px, 3vw, 44px); line-height: 1; }
.dialog-product-visual > span { position: absolute; top: 77px; left: 0; color: #a6a6a6; font-family: var(--ruijun-font-latin); font-size: 13px; }
.dialog-product-visual > img { width: min(100%, 580px); max-height: 338px; object-fit: contain; }
.dialog-model-options { position: absolute; right: 0; bottom: 0; left: 0; display: flex; flex-wrap: wrap; gap: 7px; }
.dialog-model-options button { padding: 7px 9px; color: #c8c8c8; background: #242424; border: 1px solid transparent; border-radius: 2px; cursor: pointer; font-family: var(--ruijun-font-latin); font-size: 11px; }
.dialog-model-options button:hover, .dialog-model-options button.active { color: #fff; border-color: #ef111c; }
.dialog-capabilities { display: grid; align-content: center; gap: 13px; }
.dialog-capabilities button { position: relative; display: grid; grid-template-columns: 118px minmax(0, 1fr); grid-template-rows: auto auto; min-height: 102px; overflow: hidden; color: #fff; background: #181818; border: 1px solid transparent; cursor: pointer; text-align: left; }
.dialog-capabilities button:hover, .dialog-capabilities button.active { border-color: #ef111c; }
.dialog-capabilities img { grid-row: 1 / span 2; width: 118px; height: 102px; object-fit: cover; filter: brightness(.68); }
.dialog-capabilities span { align-self: end; padding: 0 15px 4px; color: #fff; font-size: 14px; font-weight: 600; }
.dialog-capabilities small { padding: 0 15px 13px; color: #a7a7a7; font-size: 11px; line-height: 1.4; }
.dialog-specification { display: grid; grid-template-columns: 80px minmax(0, 1fr) minmax(220px, .65fr); gap: 28px; padding: 35px 56px 48px; background: #f1f1f2; color: #292929; }
.dialog-spec-label { display: flex; align-items: flex-start; gap: 9px; }
.dialog-spec-label span { display: grid; width: 34px; height: 90px; place-items: center; color: #fff; background: #1459af; border-radius: 17px; font-family: var(--ruijun-font-latin); font-size: 12px; writing-mode: vertical-rl; }
.dialog-spec-label b { color: #1459af; font-size: 14px; writing-mode: vertical-rl; }
.dialog-specification h3 { margin: 0 0 18px; color: #3c3c3c; font-family: var(--ruijun-font-latin); font-size: 21px; font-weight: 500; }
.dialog-specification dl { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 7px 24px; margin: 0; font-size: 12px; }
.dialog-specification dt { color: #6c6c6e; }
.dialog-specification dd { margin: 0; color: #333; text-align: right; }
.dialog-spec-drawing { display: grid; justify-items: center; align-content: center; min-width: 0; }
.dialog-spec-drawing strong { color: #1459af; font-family: var(--ruijun-font-latin); font-size: 30px; font-weight: 500; }
.dialog-spec-drawing img { width: 100%; max-height: 160px; object-fit: contain; }
@media (max-width: 900px) { .dialog-model-search { grid-template-columns: 1fr; gap: 18px; margin: 0 32px; padding: 8px 0 28px; }.product-model-results { grid-template-columns: 1fr; } }
@media (max-width: 1500px) { .machine-showcase, .reason-section, .specification-section, .product-resources { margin-right: 6.2%; margin-left: 6.2%; } }
@media (max-width: 900px) { .product-overview { min-height: auto; padding: 104px 24px 48px; }.product-overview::after { display: none; }.overview-kicker { top: 110px; right: 24px; }.overview-kicker span { font-size: 14px; }.proof-grid { gap: 24px; margin-top: 108px; }.product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }.product-card { min-height: 290px; }.product-card img { top: 55px; height: 148px; }.catalog-section { padding: 0 24px 60px; }.product-resources { margin-right: 6.2%; margin-left: 6.2%; }.product-dialog-backdrop { padding: 78px 18px 18px; }.product-dialog { max-height: calc(100svh - 96px); }.dialog-main { grid-template-columns: 112px minmax(0, 1fr); padding: 54px 32px 28px; gap: 24px; }.dialog-capabilities { grid-column: 1 / -1; grid-template-columns: repeat(3, 1fr); }.dialog-capabilities button { grid-template-columns: 1fr; grid-template-rows: 94px auto auto; }.dialog-capabilities img { grid-row: 1; width: 100%; height: 94px; }.dialog-capabilities span { padding-top: 9px; }.dialog-specification { grid-template-columns: 60px minmax(0, 1fr); padding: 28px 32px 38px; }.dialog-spec-drawing { grid-column: 2; }.dialog-close { top: 25px; } }
@media (max-width: 620px) { .product-overview { padding-top: 90px; }.overview-heading h1 { display: grid; gap: 8px; font-size: 42px; }.overview-heading h1 span { margin-left: 0; }.overview-kicker { top: 93px; }.overview-kicker b { font-size: 21px; }.proof-grid { grid-template-columns: 1fr; gap: 28px; margin-top: 74px; text-align: left; }.proof-grid article { justify-items: start; }.product-grid { grid-template-columns: 1fr; }.product-card { min-height: 318px; }.product-card img { height: 175px; }.product-resources { grid-template-columns: 1fr; margin: 0 16px 64px; }.product-dialog-backdrop { display: block; padding: 58px 0 0; }.product-dialog { width: 100%; max-height: calc(100svh - 58px); }.dialog-close { position: fixed; top: 14px; width: 44px; height: 44px; font-size: 31px; }.dialog-main { grid-template-columns: 1fr; min-height: auto; padding: 34px 20px 26px; }.dialog-product-picker { display: grid; grid-template-columns: repeat(3, 1fr); order: 2; }.dialog-product-picker button { height: 62px; }.dialog-product-visual { min-height: 330px; }.dialog-product-visual h2 { font-size: 31px; }.dialog-product-visual > img { margin-top: 55px; max-height: 222px; }.dialog-model-options { position: relative; margin-top: 7px; }.dialog-capabilities { grid-column: auto; grid-template-columns: 1fr; order: 3; }.dialog-capabilities button { grid-template-columns: 105px minmax(0, 1fr); grid-template-rows: auto auto; }.dialog-capabilities img { grid-row: 1 / span 2; width: 105px; height: 94px; }.dialog-model-search { margin: 0 20px; padding-bottom: 28px; }.dialog-model-search h3 { font-size: 22px; }.dialog-specification { grid-template-columns: 1fr; padding: 26px 20px 34px; }.dialog-spec-label span { width: 100%; height: 32px; border-radius: 3px; writing-mode: horizontal-tb; }.dialog-spec-label b { writing-mode: horizontal-tb; }.dialog-specification dl { grid-template-columns: 1fr; }.dialog-specification dd { padding-bottom: 8px; text-align: left; }.dialog-spec-drawing { grid-column: auto; } }

@media (max-width: 900px) { .product-card { min-height:0; }.product-card img { inset:0; width:100%; height:100%; }.product-series-panel { margin-top:38px; padding:52px 34px 34px; }.series-panel-main { grid-template-columns:150px minmax(0,1fr); gap:28px; }.series-capabilities { grid-column:1 / -1; grid-template-columns:repeat(3,1fr); justify-items:center; }.series-specification { grid-template-columns:64px minmax(0,1fr); gap:30px; padding:42px 38px; }.specification-drawings { grid-column:2; }.specification-table dl { grid-template-columns:minmax(120px,.8fr) minmax(0,1.45fr); }.specification-pager { margin-right:-38px; margin-left:-38px; margin-bottom:-34px; } }
@media (max-width: 620px) { .product-copy { width:42%; min-height:46%; padding:14px; }.product-name { font-size:20px; }.product-series-panel { margin-top:28px; padding:46px 20px 28px; border-radius:16px; }.series-panel-main { grid-template-columns:1fr; min-height:0; }.series-model-list { grid-template-columns:repeat(2,minmax(0,1fr)); }.series-machine-visual { min-height:290px; }.series-capabilities { grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }.series-capabilities img { width:82px; height:72px; }.series-specification { grid-template-columns:1fr; gap:24px; padding:32px 20px; }.specification-side-label { justify-content:flex-start; padding:0; }.specification-side-label span { width:34px; min-width:0; min-height:0; padding:0; }.specification-table dl { grid-template-columns:1fr; gap:4px; }.specification-table dt { margin-top:10px; text-align:left; }.specification-table dd { font-size:13px; }.specification-drawings { grid-column:auto; }.specification-pager { gap:9px; margin-right:-20px; margin-left:-20px; margin-bottom:-28px; }.specification-pager button { min-width:70px; } }
</style>
