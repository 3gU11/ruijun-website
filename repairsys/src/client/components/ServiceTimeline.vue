<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  requests: { type: Array, default: () => [] },
  statusTag: { type: Function, required: true }
});

const emit = defineEmits(['supplement', 'refresh']);
const expandedRequestNo = ref('');
const activeRequest = computed(() => props.requests.find((item) => !['已完成', '已寄回', '已驳回'].includes(item.status)) || props.requests[0] || null);
const otherRequests = computed(() => props.requests.filter((item) => item.requestNo !== activeRequest.value?.requestNo));
const currentTimeline = computed(() => activeRequest.value?.timeline || []);

function stageOf(status) {
  const value = String(status || '');
  if (value.includes('完成') || value.includes('寄回')) return 4;
  if (value.includes('维修') || value.includes('检测')) return 3;
  if (value.includes('审核')) return 2;
  if (value.includes('补充')) return 1;
  return 1;
}

function nextAction(request) {
  if (request?.nextAction) return request.nextAction;
  if (String(request?.status || '').includes('补充')) return '请补充工厂要求的核验照片，提交后将继续审核。';
  if (stageOf(request?.status) < 2) return '工厂正在确认受理信息，请留意审核结果。';
  if (stageOf(request?.status) < 4) return '维修完成后将同步寄回信息。';
  return '本次服务已归档，可查看设备服务记录。';
}

const stages = ['提交申请', '工厂审核', '检测维修', '寄回归档'];
</script>

<template>
  <section class="service-timeline-page" aria-label="维修进度">
    <header class="service-timeline-heading">
      <div><p>SERVICE CASE FILE</p><h1>维修进度</h1><span>优先处理当前节点，完整历史按需展开。</span></div>
      <button type="button" aria-label="刷新维修进度" @click="emit('refresh')">刷新</button>
    </header>

    <template v-if="activeRequest">
      <section class="case-task-cabin">
        <div class="case-task-cabin-head"><span>当前案件</span><small>{{ activeRequest.requestNo }}</small></div>
        <div class="case-task-cabin-main"><div><h2>{{ activeRequest.modelName || activeRequest.machineNo || '维修服务申请' }}</h2><p>{{ activeRequest.customerName || '客户信息待确认' }} · {{ activeRequest.machineNo || '设备编号待核验' }}</p></div><span class="case-status">{{ activeRequest.status }}</span></div>
        <div class="case-stage-rail" aria-label="当前维修状态">
          <div v-for="(stage, index) in stages" :key="stage" :class="{ done: index + 1 <= stageOf(activeRequest.status), active: index + 1 === stageOf(activeRequest.status) }"><i></i><span>{{ stage }}</span></div>
        </div>
        <div class="case-next-action"><span>当前下一步</span><strong>{{ nextAction(activeRequest) }}</strong><button v-if="String(activeRequest.status).includes('补充')" type="button" @click="emit('supplement', activeRequest)">补充资料</button></div>
      </section>

      <section class="case-history" aria-label="案件明细">
        <div class="case-history-head"><p>案件记录</p><span>{{ activeRequest.updatedAt || activeRequest.createdAt || '' }}</span></div>
        <article v-for="(detail, index) in activeRequest.details || []" :key="detail.id || `${detail.materialCode}-${index}`">
          <div><span>{{ String(index + 1).padStart(2, '0') }}</span><strong>{{ detail.materialName || detail.materialType || '维修物料' }}</strong></div>
          <p>{{ detail.boardNo || detail.serialNo || '编号待补充' }} · {{ detail.serviceType || '维修' }}</p>
          <small>{{ detail.warrantyResult || '等待核验' }}</small>
        </article>
      </section>

      <section class="service-vertical-timeline" aria-label="处理时间线">
        <div class="service-vertical-timeline-head"><p>处理时间线</p><span>以工厂处理记录为准</span></div>
        <ol>
          <li v-for="event in currentTimeline" :key="event.status" :class="{ reached: event.reached, active: event.status === activeRequest.status }">
            <i></i><div><strong>{{ event.status }}</strong><span>{{ event.at || (event.reached ? '处理时间待同步' : '尚未进入此阶段') }}</span></div>
          </li>
        </ol>
      </section>

      <section v-if="activeRequest.logistics || activeRequest.supplementRequirements?.length" class="case-follow-up" aria-label="案件待办">
        <article v-if="activeRequest.supplementRequirements?.length"><p>待补资料</p><strong>{{ activeRequest.supplementRequirements.join('、') }}</strong><button type="button" @click="emit('supplement', activeRequest)">补充资料</button></article>
        <article v-if="activeRequest.logistics"><p>寄回物流</p><strong>{{ activeRequest.logistics.company || '物流公司待同步' }} {{ activeRequest.logistics.trackingNo || '' }}</strong><span>{{ activeRequest.logistics.sentAt || '寄回时间待同步' }}</span></article>
      </section>
    </template>

    <div v-else class="service-timeline-empty"><strong>尚无维修申请</strong><span>提交申请后，审核、维修和寄回节点都会在这里同步。</span></div>

    <section v-if="otherRequests.length" class="case-archive" aria-label="其他维修记录">
      <h2>其他记录</h2>
      <article v-for="request in otherRequests" :key="request.requestNo">
        <button type="button" @click="expandedRequestNo = expandedRequestNo === request.requestNo ? '' : request.requestNo"><span>{{ request.requestNo }}</span><strong>{{ request.modelName || request.machineNo || '维修申请' }}</strong><em :class="`is-${statusTag(request.status)}`">{{ request.status }}</em></button>
        <div v-if="expandedRequestNo === request.requestNo" class="case-archive-detail"><span>{{ request.contact || '联系人待确认' }} · {{ request.phone || '电话待确认' }}</span><span>{{ request.updatedAt || request.createdAt || '' }}</span></div>
      </article>
    </section>
  </section>
</template>
