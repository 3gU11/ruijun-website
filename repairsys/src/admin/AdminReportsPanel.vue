<script setup>
defineProps({
  overview: { type: Object, required: true },
  statusTag: { type: Function, required: true },
  sourceChannelLabel: { type: Function, required: true }
});
</script>

<template>
  <div class="tab-body">
    <div class="result-grid">
      <div class="panel"><div class="section-title"><h2>保修判断统计</h2></div><div v-for="(count, key) in overview.warrantyStats" :key="key" class="stat-line"><span>{{ key }}</span><el-tag :type="statusTag(key)">{{ count }}</el-tag></div></div>
      <div class="panel"><div class="section-title"><h2>代理商统计</h2></div><div v-for="item in overview.byAgent" :key="item.agent" class="stat-line"><span>{{ item.agent }}</span><span>申请 {{ item.total }} / 异常 {{ item.abnormal }}</span></div></div>
      <div class="panel"><div class="section-title"><h2>零件类型统计</h2></div><div v-for="(count, key) in overview.byMaterialType" :key="key" class="stat-line"><span>{{ key }}</span><span>{{ count }}</span></div></div>
      <div class="panel"><div class="section-title"><h2>申请来源统计</h2></div><div v-for="(count, key) in overview.bySourceChannel" :key="key" class="stat-line"><span>{{ sourceChannelLabel(key) }}</span><span>{{ count }}</span></div></div>
    </div>
    <div class="panel" style="margin-top: 14px"><div class="section-title"><h2>操作日志</h2></div><div class="log-list"><div v-for="log in overview.recentLogs" :key="log.id" class="log-item"><strong>{{ log.action }} · {{ log.targetNo }}</strong><span class="muted">{{ log.operator }} / {{ log.createdAt }} / {{ log.note }}</span></div></div></div>
  </div>
</template>
