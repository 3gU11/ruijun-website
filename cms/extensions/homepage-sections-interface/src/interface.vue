<template>
  <div class="homepage-editor">
    <div class="intro"><strong>官网首页内容</strong><span>这里的修改会写入页面草稿，审核并发布后才会显示在官网。产品卡片请在“产品系列/产品型号”中维护，时间轴请在“发展历程”中维护。</span></div>
    <article v-for="(section, index) in sections" :key="`${section.id}-${index}`" class="section">
      <header><div><b>{{ sectionLabel(section.id) }}</b><small>{{ section.id }}</small></div><button type="button" :disabled="disabled" @click="remove(index)">删除</button></header>
      <div class="grid">
        <label>区块标识<input :value="section.id" :disabled="disabled" @input="update(index, 'id', $event.target.value)"></label>
        <label>顶部小标题<input :value="section.kicker || ''" :disabled="disabled" @input="update(index, 'kicker', $event.target.value)"></label>
        <label class="wide">标题<input :value="section.title || ''" :disabled="disabled" @input="update(index, 'title', $event.target.value)"></label>
        <label class="wide">说明文字<textarea :value="section.body || ''" :disabled="disabled" rows="3" @input="update(index, 'body', $event.target.value)"></textarea></label>
        <template v-if="section.id === 'product-task'">
          <label>按钮文字<input :value="section.label || ''" :disabled="disabled" @input="update(index, 'label', $event.target.value)"></label>
          <label>按钮链接<input :value="section.href || ''" :disabled="disabled" @input="update(index, 'href', $event.target.value)"></label>
        </template>
        <label v-if="section.id === 'hero'" class="wide">首屏视频/图片地址<input :value="section.video || section.image || ''" :disabled="disabled" placeholder="使用媒体资产后填写 URL 或资源路径" @input="update(index, 'video', $event.target.value)"></label>
      </div>
      <p v-if="section.requires_claim_review" class="review">此区块含宣传数字，需审核通过后才会公开。</p>
    </article>
    <div class="actions"><button type="button" :disabled="disabled" @click="add('reason')">新增首页区块</button><button type="button" :disabled="disabled" @click="add('product-task')">新增行动按钮</button></div>
  </div>
</template>

<script>
import { computed } from 'vue';

const labels = { hero: '首屏', 'why-ruijun': '三大理由总标题', performance: '理由一', 'advanced-manufacturing': '理由二', 'industry-leadership': '理由三', history: '时间轴', 'product-task': '底部行动按钮' };
export default {
  props: { value: { type: [Array, String], default: () => [] }, disabled: { type: Boolean, default: false } },
  emits: ['input'],
  setup(props, { emit }) {
    const sections = computed(() => { if (Array.isArray(props.value)) return props.value; try { const parsed = JSON.parse(props.value || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; } });
    const write = (next) => emit('input', next);
    const update = (index, field, value) => { const next = sections.value.map((item) => ({ ...item })); next[index][field] = value; write(next); };
    const remove = (index) => write(sections.value.filter((_, itemIndex) => itemIndex !== index));
    const add = (kind) => write([...sections.value, kind === 'product-task' ? { id: 'product-task', kicker: 'RUIJUN MEDIUM SPEED WIRE CUT', title: '', body: '', label: '获取选型建议', href: '/contact' } : { id: `home-section-${sections.value.length + 1}`, title: '', body: '' }]);
    return { sections, update, remove, add, sectionLabel: (id) => labels[id] || '首页区块' };
  }
};
</script>

<style scoped>
.homepage-editor{display:grid;gap:12px}.intro{display:grid;gap:3px;padding:12px;border-left:3px solid var(--theme--primary);background:var(--theme--background-accent)}.intro span,.section small,.review{color:var(--theme--foreground-subdued);font-size:12px}.section{display:grid;gap:12px;padding:14px;border:1px solid var(--theme--border-color);border-radius:6px}.section header,.actions{display:flex;align-items:center;justify-content:space-between;gap:10px}.section header div{display:grid;gap:3px}.section header button,.actions button{border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);padding:7px 10px;cursor:pointer}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.grid label{display:grid;gap:6px;color:var(--theme--foreground-subdued);font-size:12px}.grid .wide{grid-column:1/-1}.grid input,.grid textarea{box-sizing:border-box;width:100%;border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);padding:8px;font:inherit}.grid textarea{resize:vertical}.review{margin:0;border-left:3px solid var(--theme--warning);padding-left:8px}@media(max-width:700px){.grid{grid-template-columns:1fr}.grid .wide{grid-column:auto}}
</style>
