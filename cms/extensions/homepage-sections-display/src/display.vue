<template><span class="summary" :title="summary">{{ summary }}</span></template>
<script>
import { computed } from 'vue';
export default { props: { value: { type: [Array, String], default: () => [] } }, setup(props) { const summary = computed(() => { let items = props.value; if (typeof items === 'string') { try { items = JSON.parse(items); } catch { items = []; } } if (!Array.isArray(items)) return '暂无页面区块'; const labels = { hero: '首屏', 'why-ruijun': '三大理由', performance: '理由一', 'advanced-manufacturing': '理由二', 'industry-leadership': '理由三', history: '时间轴', 'product-task': '行动按钮' }; const names = items.map((item) => labels[item?.id] || item?.title || item?.id).filter(Boolean); return names.length ? names.join(' · ') : '暂无页面区块'; }); return { summary }; } };
</script>
<style scoped>.summary{display:block;max-width:520px;overflow:hidden;color:var(--theme--foreground);font-size:13px;text-overflow:ellipsis;white-space:nowrap}</style>
