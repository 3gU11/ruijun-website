<script setup>
import { computed } from 'vue';

const props = defineProps({
  user: { type: Object, default: null },
  requests: { type: Array, default: () => [] },
  activeCount: { type: Number, default: 0 },
  attentionCount: { type: Number, default: 0 },
  completedCount: { type: Number, default: 0 }
});

defineEmits(['create-request', 'view-requests', 'verify-warranty']);

const currentRequest = computed(() => props.requests.find((item) => !['已完成', '已寄回', '已驳回'].includes(item.status)) || props.requests[0] || null);
const devices = computed(() => {
  const seen = new Set();
  return props.requests
    .filter((item) => item.machineNo || item.modelName)
    .filter((item) => {
      const key = `${item.machineNo || ''}-${item.modelName || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
});
const activities = computed(() => props.requests
  .flatMap((request) => (request.timeline || [])
    .filter((event) => event.reached)
    .map((event) => ({ requestNo: request.requestNo, status: event.status, at: event.at || request.updatedAt || request.createdAt || '' })))
  .slice(-4)
  .reverse());

const stageLabels = ['已提交', '工厂审核', '检测维修', '寄回完成'];
const activeStage = computed(() => {
  const status = String(currentRequest.value?.status || '');
  if (status.includes('审核')) return 1;
  if (status.includes('维修') || status.includes('检测')) return 2;
  if (status.includes('寄回') || status.includes('完成')) return 3;
  return 0;
});

const nextAction = computed(() => {
  if (!currentRequest.value) return '选择设备并提交第一份维修申请';
  if (String(currentRequest.value.status || '').includes('补充')) return '补充工厂要求的核验资料';
  if (activeStage.value === 0) return '等待工厂确认受理';
  if (activeStage.value === 1) return '等待检测与维修安排';
  if (activeStage.value === 2) return '等待维修结果与寄回信息';
  return '查看本次维修归档结果';
});
</script>

<template>
  <section class="service-workspace" aria-label="客户服务工作台">
    <header class="service-workspace-heading">
      <div>
        <p>YOUR SERVICE DESK</p>
        <h1>设备服务</h1>
        <span>你好，{{ user?.agent || user?.name || '客户' }}。从当前任务继续，或建立新的维修档案。</span>
      </div>
      <button type="button" @click="$emit('create-request')">发起维修 <span aria-hidden="true">+</span></button>
    </header>

    <div class="service-workspace-grid">
      <section class="current-service-task" aria-labelledby="current-service-title">
        <div class="current-service-topline"><span>当前任务</span><small>{{ currentRequest?.requestNo || 'SERVICE / NEW' }}</small></div>
        <template v-if="currentRequest">
          <h2 id="current-service-title">{{ currentRequest.modelName || currentRequest.machineNo || '维修服务申请' }}</h2>
          <p>{{ currentRequest.machineNo || '设备编号待核验' }} <i></i> {{ currentRequest.status || '已提交' }}</p>
          <div class="current-service-rail" aria-label="维修进度">
            <div v-for="(label, index) in stageLabels" :key="label" :class="{ done: index <= activeStage, active: index === activeStage }"><span></span><b>{{ label }}</b></div>
          </div>
          <div class="current-service-next"><span>下一步</span><strong>{{ nextAction }}</strong></div>
          <button type="button" @click="$emit('view-requests')">查看维修详情 <span aria-hidden="true">→</span></button>
        </template>
        <template v-else>
          <h2 id="current-service-title">尚无进行中的维修</h2>
          <p>选择设备、说明故障后，工厂会在这里同步处理进度。</p>
          <div class="current-service-empty-rail"><span></span><span></span><span></span><span></span></div>
          <div class="current-service-next"><span>下一步</span><strong>{{ nextAction }}</strong></div>
          <button type="button" @click="$emit('create-request')">建立维修档案 <span aria-hidden="true">→</span></button>
        </template>
      </section>

      <aside class="service-workspace-summary" aria-label="服务概览">
        <div class="service-summary-head"><p>服务概览</p><button type="button" aria-label="查看全部维修申请" @click="$emit('view-requests')">→</button></div>
        <dl>
          <div><dt>处理中</dt><dd data-motion-counter>{{ activeCount }}</dd></div>
          <div><dt>待补资料</dt><dd data-motion-counter :class="{ attention: attentionCount }">{{ attentionCount }}</dd></div>
          <div><dt>已完成</dt><dd data-motion-counter>{{ completedCount }}</dd></div>
        </dl>
        <button type="button" class="service-summary-link" @click="$emit('verify-warranty')">核验设备保修 <span aria-hidden="true">→</span></button>
      </aside>
    </div>

    <section class="service-device-strip" aria-labelledby="service-device-title">
      <div class="service-strip-heading"><p>设备档案</p><h2 id="service-device-title">我的设备</h2></div>
      <div v-if="devices.length" class="service-device-list">
        <article v-for="device in devices" :key="`${device.machineNo}-${device.modelName}`">
          <span>{{ device.modelName || '设备型号待确认' }}</span><strong>{{ device.machineNo || '未绑定编号' }}</strong><small>{{ device.status || '服务记录可查询' }}</small>
        </article>
      </div>
      <div v-else class="service-device-empty"><span>尚未形成设备档案</span><button type="button" @click="$emit('create-request')">从维修申请建立</button></div>
    </section>

    <section class="service-activity-strip" aria-labelledby="service-activity-title">
      <div class="service-strip-heading"><p>SERVICE ACTIVITY</p><h2 id="service-activity-title">服务动态</h2></div>
      <div v-if="activities.length" class="service-activity-list"><article v-for="activity in activities" :key="`${activity.requestNo}-${activity.status}-${activity.at}`"><strong>{{ activity.status }}</strong><span>{{ activity.requestNo }}</span><small>{{ activity.at || '处理时间待同步' }}</small></article></div>
      <div v-else class="service-activity-empty">提交申请后，工厂处理节点会在这里同步。</div>
    </section>
  </section>
</template>
