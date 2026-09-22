<script setup lang="ts">
type Layer = { name: string; x: number; y: number; width: number; height: number; alt: string };
type Link = Layer & { to?: string; href?: string; layer: string };

const asset = (name: string) => `/assets/psd-footer/${name}.png`;
const hovered = ref('');
const { data: settingsResponse } = await useFetch('/api/public/v1/navigation', { default: () => ({ data: null as Record<string, any> | null }) });
const { overlayRecord } = useCmsDraftPreview();
const settings = computed(() => overlayRecord('site_settings', settingsResponse.value?.data || {}));
const footerSettings = computed(() => settings.value?.footer || {});
const contactSettings = computed(() => settings.value?.contacts || {});
const brandSettings = computed(() => settings.value?.brand || {});
const editableLayerNames = new Set(['layer-25','layer-26','layer-24','layer-23','layer-22','layer-21','layer-20','layer-16','layer-13','layer-15','layer-14','layer-19','layer-18','layer-17','layer-12','layer-11','layer-10','layer-05','layer-04','layer-08','layer-07','layer-06']);
const defaultEditableTexts = [
  { id:'products', text:'产品中心', x:1885, y:437, width:327, size:30, weight:500 },
  { id:'workstation', text:'灵动切割工作站', x:1889, y:580, width:292, size:16 },
  { id:'auto', text:'FR-XS(auto)', x:1892, y:650, width:261, size:16 },
  { id:'pro', text:'FR-XS(pro)', x:1892, y:714, width:218, size:16 },
  { id:'ft', text:'FT-XS(pro)', x:1892, y:776, width:220, size:16 },
  { id:'fr-y', text:'FR-Y', x:1892, y:833, width:192, size:16 },
  { id:'fl', text:'FL-XS(pro)', x:1892, y:895, width:216, size:16 },
  { id:'manufacturing', text:'先进智造', x:2515, y:437, width:328, size:30, weight:500 },
  { id:'cnc', text:'CNC车间', x:2514, y:588, width:155, size:16 },
  { id:'metal', text:'钣金车间', x:2514, y:642, width:163, size:16 },
  { id:'assembly', text:'装配车间', x:2514, y:696, width:163, size:16 },
  { id:'about', text:'关于我们', x:3121, y:437, width:326, size:30, weight:500 },
  { id:'honors', text:'荣誉资质认证', x:3122, y:594, width:249, size:16 },
  { id:'history', text:'品牌发展历程', x:3122, y:651, width:248, size:16 },
  { id:'address-changshu', text:'常熟工厂：江苏省苏州市常熟市沙家浜儒浜路78号', x:577, y:973, width:1062, size:16 },
  { id:'address-kunshan', text:'昆山工厂：江苏省苏州市昆山市巴城苏杭路88号', x:579, y:1039, width:1012, size:16 },
  { id:'phone-domestic', text:'热线：13738375470', x:581, y:1186, width:468, size:16 },
  { id:'phone-export', text:'外贸：17751119936', x:581, y:1232, width:468, size:16 },
  { id:'email-domestic', text:'国内邮箱：ksrjjx@126.com', x:588, y:1381, width:602, size:16 },
  { id:'email-export', text:'外贸邮箱：kylewuedm@gmail.com', x:581, y:1446, width:740, size:16 },
  { id:'purchase-title', text:'大批量采购', x:3102, y:1105, width:257, size:20 },
  { id:'purchase-copy-title', text:'你有量', x:3139, y:1198, width:183, size:32, weight:700 },
  { id:'purchase-copy-subtitle', text:'我有价', x:3139, y:1258, width:183, size:32, weight:700 },
  { id:'purchase-phone', text:'15050166844', x:3065, y:1382, width:330, size:16 }
];
const textLayerById: Record<string, string> = {
  products:'layer-25', workstation:'layer-26', auto:'layer-24', pro:'layer-23', ft:'layer-22', 'fr-y':'layer-21', fl:'layer-20',
  manufacturing:'layer-16', cnc:'layer-13', metal:'layer-15', assembly:'layer-14', about:'layer-19', honors:'layer-18', history:'layer-17',
  'address-changshu':'layer-12', 'address-kunshan':'layer-11', 'phone-domestic':'layer-10', 'phone-export':'layer-10', 'email-domestic':'layer-05', 'email-export':'layer-04',
  'purchase-title':'layer-08', 'purchase-copy-title':'layer-07', 'purchase-copy-subtitle':'layer-07', 'purchase-phone':'layer-06'
};
const layers: Layer[] = [
  { name: 'layer-28', x: 0, y: 0, width: 3896, height: 1887, alt: '' },
  { name: 'layer-27', x: 449, y: 436, width: 960, height: 126, alt: '瑞钧中走丝' },
  { name: 'layer-25', x: 1885, y: 437, width: 327, height: 70, alt: '产品中心' },
  { name: 'layer-26', x: 1889, y: 580, width: 292, height: 35, alt: '灵动切割工作站' },
  { name: 'layer-24', x: 1892, y: 650, width: 261, height: 34, alt: 'FR-XS(auto)' },
  { name: 'layer-23', x: 1892, y: 714, width: 218, height: 34, alt: 'FR-XS(pro)' },
  { name: 'layer-22', x: 1892, y: 776, width: 220, height: 34, alt: 'FT-XS(pro)' },
  { name: 'layer-21', x: 1892, y: 833, width: 192, height: 34, alt: 'FR-Y' },
  { name: 'layer-20', x: 1892, y: 895, width: 216, height: 34, alt: 'FL-XS(pro)' },
  { name: 'layer-16', x: 2515, y: 437, width: 328, height: 70, alt: '先进智造' },
  { name: 'layer-13', x: 2514, y: 588, width: 155, height: 35, alt: 'CNC车间' },
  { name: 'layer-15', x: 2514, y: 642, width: 163, height: 36, alt: '钣金车间' },
  { name: 'layer-14', x: 2514, y: 696, width: 163, height: 35, alt: '装配车间' },
  { name: 'layer-19', x: 3121, y: 437, width: 326, height: 70, alt: '关于我们' },
  { name: 'layer-18', x: 3122, y: 594, width: 249, height: 36, alt: '荣誉资质认证' },
  { name: 'layer-17', x: 3122, y: 651, width: 248, height: 35, alt: '品牌发展历程' },
  { name: 'layer-12', x: 577, y: 973, width: 1062, height: 40, alt: '常熟工厂地址' },
  { name: 'layer-11', x: 579, y: 1039, width: 1012, height: 40, alt: '昆山工厂地址' },
  { name: 'layer-01', x: 436, y: 975, width: 67, height: 100, alt: '' },
  { name: 'layer-10', x: 581, y: 1186, width: 468, height: 92, alt: '服务热线' },
  { name: 'layer-03', x: 424, y: 1183, width: 90, height: 89, alt: '' },
  { name: 'layer-05', x: 588, y: 1381, width: 602, height: 41, alt: '国内邮箱' },
  { name: 'layer-04', x: 581, y: 1446, width: 740, height: 41, alt: '外贸邮箱' },
  { name: 'layer-02', x: 422, y: 1395, width: 93, height: 65, alt: '' },
  { name: 'layer-09', x: 3007, y: 1053, width: 446, height: 431, alt: '' },
  { name: 'layer-08', x: 3099, y: 1105, width: 257, height: 44, alt: '大批量采购' },
  { name: 'layer-07', x: 3142, y: 1198, width: 183, height: 123, alt: '你有量我有价' },
  { name: 'layer-06', x: 3062, y: 1382, width: 330, height: 32, alt: '15050166844' }
];

const defaultLinks: Link[] = [
  { name: 'workstation', x: 1889, y: 580, width: 292, height: 35, alt: '灵动切割工作站', to: '/product#workstation', layer: 'layer-26' },
  { name: 'auto', x: 1892, y: 650, width: 261, height: 34, alt: 'FR-XS(auto)', to: '/product#auto', layer: 'layer-24' },
  { name: 'pro', x: 1892, y: 714, width: 218, height: 34, alt: 'FR-XS(pro)', to: '/product#pro', layer: 'layer-23' },
  { name: 'ft', x: 1892, y: 776, width: 220, height: 34, alt: 'FT-XS(pro)', to: '/product#ft', layer: 'layer-22' },
  { name: 'fr-y', x: 1892, y: 833, width: 192, height: 34, alt: 'FR-Y', to: '/product#fr-y', layer: 'layer-21' },
  { name: 'fl', x: 1892, y: 895, width: 216, height: 34, alt: 'FL-XS(pro)', to: '/product#fl', layer: 'layer-20' },
  { name: 'cnc', x: 2514, y: 588, width: 155, height: 35, alt: 'CNC车间', to: '/manufacturing#cnc', layer: 'layer-13' },
  { name: 'metal', x: 2514, y: 642, width: 163, height: 36, alt: '钣金车间', to: '/manufacturing#metal', layer: 'layer-15' },
  { name: 'assembly', x: 2514, y: 696, width: 163, height: 35, alt: '装配车间', to: '/manufacturing#assembly', layer: 'layer-14' },
  { name: 'honors', x: 3122, y: 594, width: 249, height: 36, alt: '荣誉资质认证', to: '/about#honor-title', layer: 'layer-18' },
  { name: 'history', x: 3122, y: 651, width: 248, height: 35, alt: '品牌发展历程', to: '/about#history', layer: 'layer-17' },
  { name: 'phone', x: 422, y: 1183, width: 627, height: 95, alt: '拨打服务热线', href: 'tel:13738375470', layer: 'layer-10' },
  { name: 'email-domestic', x: 422, y: 1381, width: 768, height: 49, alt: '发送国内邮件', href: 'mailto:ksrjjx@126.com', layer: 'layer-05' },
  { name: 'email-export', x: 422, y: 1446, width: 899, height: 49, alt: '发送外贸邮件', href: 'mailto:kylewuedm@gmail.com', layer: 'layer-04' },
  { name: 'purchase', x: 3007, y: 1053, width: 446, height: 431, alt: '大批量采购', href: 'tel:15050166844', layer: 'layer-08' }
];

const footerColumnSlots = [
  { titleId: 'products', linkIds: ['workstation', 'auto', 'pro', 'ft', 'fr-y', 'fl'] },
  { titleId: 'manufacturing', linkIds: ['cnc', 'metal', 'assembly'] },
  { titleId: 'about', linkIds: ['honors', 'history'] }
];
const defaultFooterColumns = footerColumnSlots.map((slot) => ({
  title: defaultEditableTexts.find((item) => item.id === slot.titleId)?.text || '',
  links: slot.linkIds.map((id) => {
    const link = defaultLinks.find((item) => item.name === id);
    return { label: defaultEditableTexts.find((item) => item.id === id)?.text || '', href: link?.to || link?.href || '' };
  })
}));

const footerFieldPaths: Record<string, string> = {
  products: 'footer.columns.0.title', workstation: 'footer.columns.0.links.0.label', auto: 'footer.columns.0.links.1.label',
  pro: 'footer.columns.0.links.2.label', ft: 'footer.columns.0.links.3.label', 'fr-y': 'footer.columns.0.links.4.label',
  fl: 'footer.columns.0.links.5.label', manufacturing: 'footer.columns.1.title', cnc: 'footer.columns.1.links.0.label',
  metal: 'footer.columns.1.links.1.label', assembly: 'footer.columns.1.links.2.label', about: 'footer.columns.2.title',
  honors: 'footer.columns.2.links.0.label', history: 'footer.columns.2.links.1.label',
  'address-changshu': 'contacts.addresses.0', 'address-kunshan': 'contacts.addresses.1', 'phone-domestic': 'contacts.domestic_phone', 'phone-export': 'contacts.export_phone',
  'email-domestic': 'contacts.domestic_email', 'email-export': 'contacts.export_email', 'purchase-title': 'footer.purchase_label',
  'purchase-copy-title': 'footer.purchase_title', 'purchase-copy-subtitle': 'footer.purchase_subtitle', 'purchase-phone': 'footer.purchase_phone'
};

function footerFieldPath(id: string) {
  return footerFieldPaths[id] || '';
}

const footerAssetFieldPaths: Record<string, string> = {
  'layer-27': 'brand.footer_logo_asset',
  'layer-01': 'footer.address_icon_asset',
  'layer-03': 'footer.phone_icon_asset',
  'layer-02': 'footer.email_icon_asset'
};

function footerAssetFieldPath(layerName: string) {
  return footerAssetFieldPaths[layerName] || '';
}

function footerAssetRole(layerName: string) {
  return layerName === 'layer-27' ? 'logo' : 'icon';
}

function safeColumns(value: unknown) {
  const columns = Array.isArray(value) ? value : [];
  return defaultFooterColumns.map((fallback, index) => {
    const column = columns[index] && typeof columns[index] === 'object' && !Array.isArray(columns[index]) ? columns[index] as Record<string, unknown> : {};
    const links = Array.isArray(column.links) ? column.links : [];
    return {
      title: Object.hasOwn(column, 'title') ? String(column.title ?? '').trim() : fallback.title,
      links: fallback.links.map((link, linkIndex) => {
        const candidate = links[linkIndex] && typeof links[linkIndex] === 'object' && !Array.isArray(links[linkIndex]) ? links[linkIndex] as Record<string, unknown> : {};
        return {
          label: Object.hasOwn(candidate, 'label') ? String(candidate.label ?? '').trim() : link.label,
          href: Object.hasOwn(candidate, 'href') ? String(candidate.href ?? '').trim() : link.href
        };
      })
    };
  });
}

function safeFooterHref(value: unknown) {
  const href = String(value || '').trim();
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  if (/^(?:tel:|mailto:)/.test(href)) return href;
  try { return new URL(href).protocol === 'https:' ? href : ''; } catch { return ''; }
}

const resolvedColumns = computed(() => safeColumns(footerSettings.value.columns));
const editableTexts = computed(() => {
  const textById = new Map(defaultEditableTexts.map((item) => [item.id, item.text]));
  resolvedColumns.value.forEach((column, columnIndex) => {
    const slot = footerColumnSlots[columnIndex];
    if (!slot) return;
    textById.set(slot.titleId, column.title);
    slot.linkIds.forEach((id, linkIndex) => textById.set(id, column.links[linkIndex]?.label || ''));
  });
  const addresses = Array.isArray(contactSettings.value.addresses) ? contactSettings.value.addresses : [];
  if (addresses.length) {
    textById.set('address-changshu', String(addresses[0] || ''));
    textById.set('address-kunshan', String(addresses[1] || ''));
  }
  const domesticPhone = String(contactSettings.value.domestic_phone || contactSettings.value.service_phone || '').trim();
  const exportPhone = String(contactSettings.value.export_phone || '').trim();
  if (domesticPhone) textById.set('phone-domestic', `热线：${domesticPhone}`);
  if (exportPhone) textById.set('phone-export', `外贸：${exportPhone}`);
  if (contactSettings.value.domestic_email) textById.set('email-domestic', `国内邮箱：${contactSettings.value.domestic_email}`);
  if (contactSettings.value.export_email) textById.set('email-export', `外贸邮箱：${contactSettings.value.export_email}`);
  if (footerSettings.value.purchase_label) textById.set('purchase-title', String(footerSettings.value.purchase_label));
  if (footerSettings.value.purchase_title) textById.set('purchase-copy-title', String(footerSettings.value.purchase_title));
  if (footerSettings.value.purchase_subtitle) textById.set('purchase-copy-subtitle', String(footerSettings.value.purchase_subtitle));
  if (footerSettings.value.purchase_phone) textById.set('purchase-phone', String(footerSettings.value.purchase_phone));
  return defaultEditableTexts.map((item) => ({ ...item, text: textById.get(item.id) || '' }));
});

function configuredTextStyle(id: string) {
  const source = footerSettings.value?.text_styles;
  const style = source && typeof source === 'object' && !Array.isArray(source) ? (source[id] || (id.startsWith('phone-') ? source.phone : null)) : null;
  if (!style || typeof style !== 'object' || style.enabled !== true) return null;
  const weight = [300, 400, 500, 700, 800].includes(Number(style.weight)) ? Number(style.weight) : 400;
  const sizeDesktop = Number(style.size_desktop);
  const sizeMobile = Number(style.size_mobile);
  const lineHeight = Number(style.line_height);
  const color = /^#[0-9a-f]{6}$/i.test(String(style.color || '').trim()) ? String(style.color).trim() : '';
  return {
    weight,
    sizeDesktop: Number.isFinite(sizeDesktop) && sizeDesktop >= 12 && sizeDesktop <= 72 ? sizeDesktop : 16,
    sizeMobile: Number.isFinite(sizeMobile) && sizeMobile >= 12 && sizeMobile <= 40 ? sizeMobile : 14,
    lineHeight: Number.isFinite(lineHeight) && lineHeight >= 1 && lineHeight <= 2.2 ? lineHeight : 1.35,
    color
  };
}

function editableTextStyle(text: typeof defaultEditableTexts[number]) {
  const configured = configuredTextStyle(text.id);
  return {
    left: `${text.x / 3896 * 100}%`,
    top: `${text.y / 1887 * 100}%`,
    width: `${text.width / 3896 * 100}%`,
    fontWeight: configured?.weight || text.weight || 400,
    ...(configured ? {
      '--cms-footer-font-size-desktop': `${configured.sizeDesktop}px`,
      '--cms-footer-font-size-mobile': `${configured.sizeMobile}px`,
      lineHeight: configured.lineHeight,
      color: configured.color || undefined
    } : {})
  };
}

const links = computed<Link[]>(() => {
  const hrefById = new Map(defaultLinks.map((item) => [item.name, item.to || item.href || '']));
  resolvedColumns.value.forEach((column, columnIndex) => footerColumnSlots[columnIndex]?.linkIds.forEach((id, linkIndex) => hrefById.set(id, safeFooterHref(column.links[linkIndex]?.href))));
  const phone = String(contactSettings.value.domestic_phone || contactSettings.value.service_phone || '').replace(/[^+\d]/g, '');
  const domesticEmail = String(contactSettings.value.domestic_email || '').trim();
  const exportEmail = String(contactSettings.value.export_email || '').trim();
  const purchasePhone = String(footerSettings.value.purchase_phone || '').replace(/[^+\d]/g, '');
  if (phone) hrefById.set('phone', `tel:${phone}`);
  if (domesticEmail) hrefById.set('email-domestic', `mailto:${domesticEmail}`);
  if (exportEmail) hrefById.set('email-export', `mailto:${exportEmail}`);
  if (purchasePhone) hrefById.set('purchase', `tel:${purchasePhone}`);
  return defaultLinks.flatMap((item) => {
    const href = hrefById.get(item.name) || '';
    if (!href) return [];
    return [{ ...item, to: href.startsWith('/') ? href : undefined, href: href.startsWith('/') ? undefined : href }];
  });
});

function controlledAssetPath(value: unknown, resolved: unknown, fallback: string) {
  const resolvedPath = String(resolved || '').trim();
  if (/^https?:\/\//.test(resolvedPath)) return resolvedPath;
  const path = String(value || '').trim();
  return path.startsWith('/assets/') ? path : fallback;
}

const customLayerAssets = computed<Record<string, string>>(() => ({
  'layer-27': controlledAssetPath(brandSettings.value.footer_logo_asset || brandSettings.value.logo_asset, brandSettings.value.footer_logo_path || brandSettings.value.logo_path, asset('layer-27')),
  'layer-01': controlledAssetPath(footerSettings.value.address_icon_asset, footerSettings.value.address_icon_path, asset('layer-01')),
  'layer-03': controlledAssetPath(footerSettings.value.phone_icon_asset, footerSettings.value.phone_icon_path, asset('layer-03')),
  'layer-02': controlledAssetPath(footerSettings.value.email_icon_asset, footerSettings.value.email_icon_path, asset('layer-02'))
}));

const styleFor = (item: Layer) => ({
  left: `${(item.x / 3896) * 100}%`,
  top: `${(item.y / 1887) * 100}%`,
  width: `${(item.width / 3896) * 100}%`,
  height: `${(item.height / 1887) * 100}%`
});
</script>

<template>
  <footer class="psd-footer" aria-label="网站页脚导航" data-cms-preview-key="site-footer" data-cms-preview-collection="site_settings" :data-cms-preview-item-id="settings.id">
    <img v-for="layer in layers.filter((item) => !editableLayerNames.has(item.name))" :key="layer.name" class="psd-footer__layer" :class="{ 'psd-footer__layer--hovered': hovered === layer.name }" :src="customLayerAssets[layer.name] || asset(layer.name)" :alt="layer.alt" :style="styleFor(layer)" :data-cms-preview-field-path="footerAssetFieldPath(layer.name) || undefined" :data-cms-preview-media-role="footerAssetFieldPath(layer.name) ? footerAssetRole(layer.name) : undefined" :data-cms-preview-allow-default="footerAssetFieldPath(layer.name) ? 'true' : undefined">
    <div class="psd-footer__editable">
      <p v-for="text in editableTexts" :key="text.id" :class="['psd-footer__text', `psd-footer__text--${text.id}`, { 'has-cms-text-style': configuredTextStyle(text.id), 'is-highlighted': hovered === textLayerById[text.id] || (hovered === 'layer-08' && text.id.startsWith('purchase-')) }]" :data-cms-preview-field-path="footerFieldPath(text.id)" :style="editableTextStyle(text)">{{ text.text }}</p>
    </div>
    <NuxtLink v-for="link in links.filter((item) => item.to)" :key="link.name" class="psd-footer__hit" :to="link.to!" :external="link.to?.startsWith('/product#')" :aria-label="link.alt" :style="styleFor(link)" @mouseenter="hovered = link.layer" @mouseleave="hovered = ''" />
    <a v-for="link in links.filter((item) => item.href)" :key="link.name" class="psd-footer__hit" :href="link.href" :aria-label="link.alt" :style="styleFor(link)" @mouseenter="hovered = link.layer" @mouseleave="hovered = ''" />
  </footer>
</template>

<style scoped>
.psd-footer{position:relative;width:100%;aspect-ratio:3896/1887;overflow:hidden;background:#0e0e0f}
.psd-footer__layer,.psd-footer__hit{position:absolute;display:block;max-width:none}
.psd-footer__layer[alt=""]{pointer-events:none}.psd-footer__layer--hovered{filter:brightness(0) saturate(100%) invert(16%) sepia(93%) saturate(3656%) hue-rotate(349deg) brightness(94%) contrast(88%)}
.psd-footer__editable{position:absolute;inset:0;z-index:1;pointer-events:none}.psd-footer__text{position:absolute;margin:0;white-space:pre-line;color:#bcbcbc;font-family:var(--ruijun-font-cn);font-size:calc(36 / 3896 * 100vw);line-height:1.35;transition:color .18s ease,filter .18s ease,transform .18s ease}.psd-footer__text--products,.psd-footer__text--manufacturing,.psd-footer__text--about{color:#f22631;font-size:calc(64 / 3896 * 100vw);line-height:1.1}.psd-footer__text--address-changshu,.psd-footer__text--address-kunshan,.psd-footer__text--phone-domestic,.psd-footer__text--phone-export,.psd-footer__text--email-domestic,.psd-footer__text--email-export{font-size:calc(34 / 3896 * 100vw)}.psd-footer__text--purchase-title,.psd-footer__text--purchase-copy-title,.psd-footer__text--purchase-copy-subtitle,.psd-footer__text--purchase-phone{text-align:center}.psd-footer__text--purchase-title{font-size:calc(36 / 3896 * 100vw);white-space:nowrap}.psd-footer__text--purchase-copy-title,.psd-footer__text--purchase-copy-subtitle{color:#00b9e7;font-size:calc(54 / 3896 * 100vw);line-height:1.08}.psd-footer__text--purchase-phone{font-size:calc(30 / 3896 * 100vw);letter-spacing:.04em}.psd-footer__text.is-highlighted{color:#fff;filter:drop-shadow(0 0 5px rgb(242 38 49 / 75%));transform:translateY(-1px)}.psd-footer__text.has-cms-text-style{font-size:var(--cms-footer-font-size-desktop)}
.psd-footer__hit{z-index:2;height:calc(var(--h)/1887*100%);outline:none}.psd-footer__hit:focus-visible{outline:2px solid #ed1f2b;outline-offset:4px}
@media(max-width:760px){.psd-footer__text.has-cms-text-style{font-size:var(--cms-footer-font-size-mobile)}}
</style>

<style>
html[data-cms-preview-edit-mode="true"] .psd-footer__text[data-cms-preview-field-path]{pointer-events:auto;cursor:text}
html[data-cms-preview-edit-mode="true"] .psd-footer__layer[data-cms-preview-field-path]{pointer-events:auto}
html[data-cms-preview-edit-mode="true"] .psd-footer__hit{pointer-events:none}
</style>
