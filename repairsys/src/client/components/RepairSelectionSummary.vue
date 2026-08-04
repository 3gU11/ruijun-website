<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelName: { type: String, default: '' },
  modelCode: { type: String, default: '' },
  warrantyScope: { type: String, default: 'in' },
  items: { type: Array, default: () => [] },
  compact: { type: Boolean, default: false },
  editable: { type: Boolean, default: false }
});

defineEmits(['edit-model', 'edit-materials', 'edit-issues']);

const materialNames = computed(() => props.items.map((item) => item.materialName || item.materialCode).filter(Boolean).join('、'));
</script>

<template>
  <section :class="['repair-selection-summary', { 'is-compact': compact }]" aria-label="当前服务选择">
    <div v-if="!compact" class="repair-summary-heading">
      <div><span>SERVICE SUMMARY</span><h3>确认当前服务选择</h3></div>
      <p>登录后将继续核验设备编号和联系信息。</p>
    </div>
    <div class="repair-summary-grid">
      <div>
        <span>机型</span>
        <strong>{{ modelName || modelCode || '未选择' }}</strong>
        <button v-if="editable" type="button" @click="$emit('edit-model')">修改</button>
      </div>
      <div>
        <span>保修意向</span>
        <strong>{{ warrantyScope === 'in' ? '保修期内' : '保修期外' }}</strong>
        <button v-if="editable" type="button" @click="$emit('edit-model')">修改</button>
      </div>
      <div>
        <span>维修物料</span>
        <strong>{{ materialNames || '未选择' }}</strong>
        <button v-if="editable" type="button" @click="$emit('edit-materials')">修改</button>
      </div>
      <div>
        <span>服务方式</span>
        <strong>{{ items.map((item) => item.serviceType).filter(Boolean).join('、') || '未选择' }}</strong>
        <button v-if="editable" type="button" @click="$emit('edit-issues')">修改</button>
      </div>
    </div>
    <div v-if="!compact && items.length" class="repair-summary-items">
      <div v-for="item in items" :key="item.materialCode">
        <strong>{{ item.materialName || item.materialCode }}</strong>
        <span>{{ item.faultCategory || item.faultPhenomenon || '未选择故障类型' }} · {{ item.serviceType }}</span>
      </div>
    </div>
  </section>
</template>
