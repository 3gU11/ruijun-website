<script setup lang="ts">
useSeoMeta({ title: '先进智造', description: '瑞钧智科中走丝线切割机床制造能力、工厂与检测流程。' });
const { data: publicEvidence } = await useFetch('/api/public/v1/manufacturing-evidence', {
  default: () => ({ data: [] as Array<{ process: string; description: string }>, source: 'static', cache: 'unavailable' })
});
const fallbackCapabilities = [['精密加工', '控制基础部件的加工与装配基准，为设备精度建立稳定基础。'], ['标准化装配', '统一装配工艺与检验节点，降低不同批次之间的状态差异。'], ['整机验证', '通过运行、加工与精度检测确认设备交付状态。']];
const capabilityTitles: Record<string, string> = {
  'precision-machining': '精密加工',
  'standardized-assembly': '标准化装配',
  'whole-machine-validation': '整机验证'
};
const capabilities = computed(() => publicEvidence.value?.data?.length
  ? publicEvidence.value.data.map((evidence) => [capabilityTitles[evidence.process] || '制造能力', evidence.description])
  : fallbackCapabilities);
</script>
<template><main class="manufacturing"><SiteHeader/><section class="hero"><div><p>ADVANCED MANUFACTURING</p><h1>把稳定性<br>制造进每一台设备</h1><span>以精密加工、恒温装配、过程检测与整机验证构建一致的制造标准。</span></div></section><section class="system"><div class="section-inner"><div class="section-heading"><h2>制造体系</h2><p>从关键零部件到整机交付，每一道工序围绕加工精度、设备可靠性与长期运行状态展开。</p></div><div class="capabilities"><article v-for="([title, text], index) in capabilities" :key="title"><b>0{{ index + 1 }}</b><h3>{{ title }}</h3><p>{{ text }}</p></article></div></div></section><img class="wide-media" src="/assets/psd/reason-factory-full.jpg" alt="瑞钧智科制造工厂"><SiteFooter/></main></template>
<style scoped>.manufacturing{min-height:100vh;background:var(--ruijun-paper);color:#161719}.hero{position:relative;min-height:68svh;display:flex;align-items:flex-end;padding:150px 6.2% 8vh;overflow:hidden;isolation:isolate;color:#fff;background:#151719 url('/assets/psd/reason-factory-full.jpg') center/cover no-repeat}.hero::after{content:"";position:absolute;z-index:-1;inset:0;background:rgb(7 9 11/52%)}.hero>div{width:min(980px,100%)}.hero p{margin:0 0 16px;color:#ef3840;font-size:12px;font-weight:700}.hero h1{max-width:920px;margin:0;font-size:clamp(58px,6.1vw,88px);line-height:1.02;font-weight:600}.hero span{display:block;max-width:650px;margin-top:24px;color:rgb(255 255 255/78%);font-size:17px}.system{padding:90px 6.2%}.section-inner{width:min(var(--ruijun-max),100%);margin:0 auto}.section-heading{display:grid;grid-template-columns:minmax(220px,.7fr) minmax(0,1.3fr);gap:8vw;align-items:end;margin-bottom:50px}.section-heading h2{margin:0;font-size:54px;line-height:1.12}.section-heading p{max-width:660px;margin:0;color:#6f7276;font-size:16px}.capabilities{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid #d1d3d2;border-bottom:1px solid #d1d3d2}.capabilities article{min-height:220px;padding:34px 34px 34px 0}.capabilities article+article{padding-left:34px;border-left:1px solid #d1d3d2}.capabilities b{display:block;margin-bottom:20px;color:var(--ruijun-red);font-size:13px}.capabilities h3{margin:0 0 14px;font-size:26px}.capabilities p{margin:0;color:#74777b}.wide-media{width:100%;height:min(62vw,680px);object-fit:cover}
@media(max-width:900px){.hero{min-height:62svh;padding:120px 22px 58px}.hero h1{font-size:50px}.hero span{font-size:15px}.system{padding:62px 22px}.section-heading{grid-template-columns:1fr;gap:18px;margin-bottom:34px}.section-heading h2{font-size:38px}.capabilities{grid-template-columns:1fr}.capabilities article,.capabilities article+article{min-height:0;padding:28px 0;border-left:0;border-bottom:1px solid #d1d3d2}.wide-media{height:62svh}}
</style>
