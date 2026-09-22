<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'full' | 'compact'; homePsd?: boolean }>(), { variant: 'compact', homePsd: false });
const { data: settingsResponse } = await useFetch('/api/public/v1/navigation', { default: () => ({ data: null as Record<string, any> | null }) });
const { overlayRecord } = useCmsDraftPreview();
const settings = computed(() => overlayRecord('site_settings', settingsResponse.value?.data || {}));
const contacts = computed(() => settings.value.contacts || {});
const footer = computed(() => settings.value.footer || {});
const fallbackColumns = [
  { title: '产品中心', links: [{ label: '灵动切割工作站', href: '/product#workstation' }, { label: 'FR-XS(auto)', href: '/product#auto' }, { label: 'FR-XS(pro)', href: '/product#pro' }, { label: 'FT-XS(pro)', href: '/product#ft' }, { label: 'FR-Y', href: '/product#fr-y' }, { label: 'FL-XS(pro)', href: '/product#fl' }] },
  { title: '先进智造', links: [{ label: 'CNC车间', href: '/manufacturing#cnc' }, { label: '钣金车间', href: '/manufacturing#metal' }, { label: '装配车间', href: '/manufacturing#assembly' }] },
  { title: '关于我们', links: [{ label: '荣誉资质认证', href: '/about#honors' }, { label: '品牌发展历程', href: '/about#history' }] }
];
const footerColumns = computed(() => {
  const configured = Array.isArray(footer.value.columns) ? footer.value.columns : [];
  const normalized = configured.flatMap((column: any) => {
    const title = String(column?.title || column?.label || '').trim();
    const links = Array.isArray(column?.links) ? column.links.flatMap((link: any) => {
      const label = String(link?.label || '').trim(); const href = String(link?.href || '').trim();
      return label && href ? [{ label, href }] : [];
    }) : [];
    return title && links.length ? [{ title, links }] : [];
  });
  // Keep every valid CMS column. The desktop grid has room for the original
  // three columns, and expands predictably when an editor adds more.
  if (normalized.length) return normalized;
  const primary = Array.isArray(footer.value.primary_links) ? footer.value.primary_links.filter((link: any) => String(link?.label || '').trim() && String(link?.href || '').trim()) : [];
  return primary.length ? [{ title: String(footer.value.primary_title || '快捷链接'), links: primary }, ...fallbackColumns.slice(1)] : fallbackColumns;
});
const addresses = computed(() => Array.isArray(contacts.value.addresses) ? contacts.value.addresses : [
  '常熟工厂：江苏省苏州市常熟市沙家浜儒浜路78号', '昆山工厂：江苏省苏州市昆山市巴城苏杭路88号'
]);
const domesticPhone = computed(() => contacts.value.domestic_phone || '13738375470');
const exportPhone = computed(() => contacts.value.export_phone || '17751119936');
const domesticEmail = computed(() => contacts.value.domestic_email || 'ksrjjx@126.com');
const exportEmail = computed(() => contacts.value.export_email || 'kylewuedm@gmail.com');
const purchasePhone = computed(() => footer.value.purchase_phone || '15050166844');
function resolvedAsset(resolved: unknown, fallback: string) {
  const value = String(resolved || '').trim();
  return /^https?:\/\//.test(value) || value.startsWith('/assets/') ? value : fallback;
}
const footerWordmark = computed(() => resolvedAsset(settings.value?.brand?.footer_logo_path || settings.value?.brand?.logo_path, '/assets/psd/footer/wordmark.png'));
const addressIcon = computed(() => resolvedAsset(footer.value.address_icon_path, '/assets/psd/footer/address.png'));
const phoneIcon = computed(() => resolvedAsset(footer.value.phone_icon_path, '/assets/psd/footer/phone.png'));
const emailIcon = computed(() => resolvedAsset(footer.value.email_icon_path, '/assets/psd/footer/email.png'));
const copyright = computed(() => String(footer.value.copyright || '© 2026 Suzhou Ruijun Intelligence Technology Co., Ltd.'));
</script>

<template>
  <footer v-if="variant === 'full'" class="site-footer">
    <div class="footer-contact">
      <NuxtLink class="footer-wordmark" to="/" aria-label="返回首页"><img :src="footerWordmark" :alt="String(settings?.brand?.display_name || '瑞钧中走丝')"></NuxtLink>
      <div class="contact-row"><img :src="addressIcon" alt=""><p><template v-for="address in addresses" :key="address">{{ address }}<br></template></p></div>
      <div class="contact-row"><img :src="phoneIcon" alt=""><p>热线：{{ domesticPhone }}<br>外贸：{{ exportPhone }}</p></div>
      <div class="contact-row"><img :src="emailIcon" alt=""><p>国内邮箱：{{ domesticEmail }}<br>外贸邮箱：{{ exportEmail }}</p></div>
    </div>
    <nav v-for="column in footerColumns" :key="column.title" class="footer-column"><b>{{ column.title }}</b><NuxtLink v-for="link in column.links" :key="`${column.title}-${link.href}`" :to="link.href">{{ link.label }}</NuxtLink></nav>
    <a class="purchase-card" :href="`tel:${purchasePhone}`"><span>{{ footer.purchase_label || '大批量采购' }}</span><strong>{{ footer.purchase_title || '你有量' }}<br>{{ footer.purchase_subtitle || '我有价' }}</strong><b>{{ purchasePhone }}</b></a>
  </footer>
  <footer v-else class="compact-footer"><span>{{ copyright }}</span><NuxtLink to="/service">联系瑞钧</NuxtLink></footer>
</template>

<style scoped>
.site-footer{position:relative;display:grid;grid-template-columns:31.5vw repeat(auto-fit,minmax(10.4vw,1fr));column-gap:5.6vw;min-height:48.5vw;padding:11.3vw 10.8vw 54px;background:#111;color:#fff;font-family:var(--ruijun-font-cn)}
.footer-contact{display:flex;flex-direction:column;gap:2vw}.footer-wordmark{display:block;width:25vw;margin-bottom:6.4vw}.footer-wordmark img{display:block;width:100%;height:auto}.contact-row{display:flex;align-items:center;gap:1.62vw;color:#eee;font-size:1.13vw;line-height:1.65}.contact-row img{width:2.43vw;height:2.43vw;object-fit:contain}.contact-row p{margin:0}.footer-column{display:flex;flex-direction:column;align-items:flex-start;gap:1.05vw;padding-top:0;color:#aaa;font-size:1.13vw;line-height:1.2}.footer-column b{margin-bottom:1.05vw;color:#f22;font-size:2.02vw;font-weight:500;white-space:nowrap}.footer-column a{color:inherit;text-decoration:none}.footer-column a:hover{color:#fff}.purchase-card{position:absolute;top:56.8%;right:10.8vw;display:flex;width:11.6vw;min-height:11.2vw;flex-direction:column;align-items:center;justify-content:center;background:#292929;color:#eee;text-decoration:none}.purchase-card span{font-size:1.29vw}.purchase-card strong{margin:.97vw 0 1.05vw;color:#12cfe8;font-size:1.62vw;line-height:1.05;text-align:center;font-weight:500}.purchase-card b{font-size:1.29vw;font-weight:400;white-space:nowrap}@media(max-width:760px){.site-footer{grid-template-columns:1fr 1fr;padding:48px 24px;gap:30px;min-height:auto}.footer-contact{grid-column:1/-1;gap:25px}.footer-wordmark{width:270px;margin-bottom:25px}.contact-row{gap:20px;font-size:14px}.contact-row img{width:30px;height:30px}.footer-column{gap:13px;padding-top:0;font-size:14px}.footer-column b{margin-bottom:13px;font-size:25px}.purchase-card{position:static;grid-column:1/-1;max-width:190px;min-height:137px}.purchase-card span{font-size:16px}.purchase-card strong{margin:12px 0 13px;font-size:20px}.purchase-card b{font-size:16px}.compact-footer{min-height:90px;padding:24px 20px;display:flex;flex-direction:column;align-items:flex-start;gap:8px;background:#111;color:#8f9195;font-size:12px}.compact-footer a{color:#fff;text-decoration:none}}
</style>
