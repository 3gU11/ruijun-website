<script setup lang="ts">
useSeoMeta({ title: '售后服务中心', description: '设备保修查询、故障报修与维修进度服务' });
const model = ref('');
const cards = [
  { title: '提交报修', text: '描述设备故障，提交照片和联系方式', to: '/repair/new', accent: true },
  { title: '保修查询', text: '输入机器编号，快速确认服务资格', to: '/repair/warranty' },
  { title: '维修进度', text: '查看申请审核、维修和寄回状态', to: '/repair/requests' }
];
const modelOptions = ['灵动工作站', 'FR-XS(auto)', 'FR-XS(pro)', 'FT-XS', 'FL-XS(pro)', 'FR-Y', 'FR-G', 'FH-C', '定制机型'];
const target = computed(() => model.value ? `/repair/new?model=${encodeURIComponent(model.value)}` : '/repair/new');
</script>
<template><RepairShell title="让每一次服务，都有明确的下一步" intro="从设备识别到维修进度，官网与售后服务现在使用同一条服务链路。"><template #default>
  <section class="repair-panel"><div><p class="kicker">START WITH YOUR MACHINE</p><h2>先选择设备型号</h2><p>我们会根据型号为你准备对应的故障信息和服务入口。</p></div><div class="model-picker"><select v-model="model" aria-label="设备型号"><option value="">选择设备型号</option><option v-for="item in modelOptions" :key="item" :value="item">{{ item }}</option></select><NuxtLink class="primary" :to="target">开始服务 <span>→</span></NuxtLink></div></section>
  <section class="repair-cards"><NuxtLink v-for="card in cards" :key="card.to" :to="card.to" class="repair-card" :class="{ accent: card.accent }"><span class="card-index">0{{ cards.indexOf(card) + 1 }}</span><h3>{{ card.title }} <span>↗</span></h3><p>{{ card.text }}</p></NuxtLink></section>
  <section class="repair-note"><strong>遇到无法判断的故障？</strong><span>先咨询 AI，必要时可将诊断结果带入报修申请。</span><NuxtLink to="/service">前往服务支持 →</NuxtLink></section>
</template></RepairShell></template>
<style scoped>
.repair-panel{display:grid;grid-template-columns:1fr minmax(300px,440px);gap:30px;align-items:end;padding:42px;background:#fff}.kicker{margin:0;color:#e51b23;font-size:11px;letter-spacing:.16em}.repair-panel h2{margin:9px 0;font-size:30px;font-weight:400}.repair-panel p{margin:0;color:#707070}.model-picker{display:flex;gap:10px}.model-picker select{min-width:0;flex:1;padding:13px;border:1px solid #ccc;background:#fff}.primary{display:inline-flex;align-items:center;justify-content:center;gap:20px;padding:13px 18px;background:#e51b23;color:#fff;text-decoration:none;white-space:nowrap}.repair-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:14px}.repair-card{min-height:210px;padding:25px;background:#fff;color:#171717;text-decoration:none;transition:transform .2s,background .2s}.repair-card:hover{transform:translateY(-4px)}.repair-card.accent{background:#171717;color:#fff}.card-index{color:#e51b23;font-size:12px}.repair-card h3{margin:45px 0 8px;font-size:25px;font-weight:400}.repair-card h3 span{float:right}.repair-card p{margin:0;color:#777}.repair-card.accent p{color:#bbb}.repair-note{display:flex;align-items:center;gap:20px;margin-top:14px;padding:20px 24px;background:#e9e9e5}.repair-note span{color:#707070}.repair-note a{margin-left:auto;color:#e51b23;text-decoration:none}@media(max-width:760px){.repair-panel{grid-template-columns:1fr;padding:25px}.model-picker{display:grid}.repair-cards{grid-template-columns:1fr}.repair-card{min-height:160px}.repair-card h3{margin-top:25px}.repair-note{align-items:flex-start;flex-direction:column;gap:5px}.repair-note a{margin-left:0}}
</style>
