<script setup lang="ts">
import { resolveRepairPortalUrl } from '~/shared/repair-portal.mjs';

type Topic = {
  title: string;
  eyebrow: string;
  description: string;
  intro: string;
  steps: Array<{ title: string; copy: string }>;
  action?: 'repair_new' | 'repair_warranty';
  actionLabel?: string;
};

const route = useRoute();
const runtimeConfig = useRuntimeConfig();
const selectedModel = computed(() => String(route.query.model || '').trim());

const topics: Record<string, Topic> = {
  repair: {
    title: '我的维修申请', eyebrow: 'SERVICE REQUEST',
    description: '在线提交设备故障与维修需求，后续可持续查看处理进度。',
    intro: '提交前请准备设备型号、出厂编号、故障现象和现场图片，有助于工程师更快判断。',
    action: 'repair_new', actionLabel: '开始维修申请',
    steps: [
      { title: '填写设备信息', copy: '选择机型并补充设备编号、联系人及设备所在地。' },
      { title: '描述故障现象', copy: '说明报警代码、异常表现和问题出现的时间。' },
      { title: '上传现场资料', copy: '补充清晰照片或短视频，便于远程预判。' },
      { title: '等待服务受理', copy: '服务人员确认信息后给出处理方式与后续安排。' }
    ]
  },
  warranty: {
    title: '保修状态验核', eyebrow: 'WARRANTY CHECK',
    description: '根据设备信息核验保修状态及可用服务范围。',
    intro: '保修结论以设备出厂记录、合同约定及现场核验结果为准。',
    action: 'repair_warranty', actionLabel: '进入保修验核',
    steps: [
      { title: '准备设备编号', copy: '设备铭牌上的出厂编号是保修核验的主要依据。' },
      { title: '确认购机信息', copy: '补充购买时间、经销渠道和使用单位。' },
      { title: '提交核验', copy: '系统将关联设备档案并生成初步状态。' },
      { title: '人工复核', copy: '存在记录差异时，由服务人员进一步确认。' }
    ]
  },
  process: {
    title: '服务流程与寄修', eyebrow: 'SERVICE PROCESS',
    description: '从问题受理、远程判断到现场或寄修处理的标准流程。',
    intro: '请在寄出设备或部件前先创建维修申请，未经确认直接寄送可能造成识别和时效问题。',
    steps: [
      { title: '在线报修', copy: '提交设备、故障和联系方式，生成服务记录。' },
      { title: '技术预判', copy: '工程师远程确认问题范围与建议处理方式。' },
      { title: '现场或寄修', copy: '根据确认结果安排上门服务，或按指引寄送部件。' },
      { title: '维修与测试', copy: '完成检修、零件更换和运行验证。' },
      { title: '交付与回访', copy: '反馈处理结果并完成服务记录归档。' }
    ]
  },
  maintenance: {
    title: '保养与易损件', eyebrow: 'MAINTENANCE',
    description: '按设备运行周期安排清洁、润滑、检查与易损件更换。',
    intro: '实际保养周期受加工强度、工作液、环境和材料影响，应结合设备说明书执行。',
    steps: [
      { title: '每日检查', copy: '检查工作液、导轮、运丝状态和机床清洁情况。' },
      { title: '周期保养', copy: '按运行时长检查过滤、润滑、电气连接和传动部件。' },
      { title: '易损件确认', copy: '根据机型核对导轮、导电块、过滤器等规格。' },
      { title: '原厂件咨询', copy: '提交机型与部件照片，避免规格不符。' }
    ]
  },
  knowledge: {
    title: '知识分享', eyebrow: 'KNOWLEDGE BASE',
    description: '汇总设备操作、加工工艺、精度维护与日常管理知识。',
    intro: '这里展示已由内容后台审核并发布的知识内容。', steps: []
  },
  faults: {
    title: '常见故障分析', eyebrow: 'TROUBLESHOOTING',
    description: '按故障现象快速定位检查方向，必要时转交服务工程师。',
    intro: '这里展示已由技术人员审核并发布的故障分析。', steps: []
  },
  video: {
    title: '视频教学', eyebrow: 'VIDEO TUTORIALS',
    description: '按设备与操作场景查看教学内容。',
    intro: '这里展示已由内容后台审核并发布的视频教学。',
    steps: []
  }
};

const topicKey = computed(() => String(route.params.topic || ''));
const baseTopic = computed(() => topics[topicKey.value]);
if (!baseTopic.value) throw createError({ statusCode: 404, statusMessage: 'Service page not found' });

const portalUrl = computed(() => {
  if (!topic.value.action) return '';
  const externalUrl = resolveRepairPortalUrl(topic.value.action, String(runtimeConfig.public.repairPortalUrl || ''), selectedModel.value ? { model: selectedModel.value } : {});
  if (externalUrl) return externalUrl;
  const localPath = topic.value.action === 'repair_warranty' ? '/repair/warranty' : '/repair/new';
  return selectedModel.value ? `${localPath}?model=${encodeURIComponent(selectedModel.value)}` : localPath;
});

const { data: resourceResponse } = await useFetch('/api/public/v1/service-resources', { default: () => ({ data: [] as Array<Record<string, any>> }) });
const { data: knowledgeResponse } = await useFetch('/api/public/v1/knowledge-items', { default: () => ({ data: [] as Array<Record<string, any>> }) });
const { data: servicePageResponse } = await useFetch('/api/public/v1/pages/service', { default: () => ({ data: null as Record<string, any> | null }) });
const { overlayList } = useCmsDraftPreview();
const resources = computed(() => overlayList('service_resources', Array.isArray(resourceResponse.value?.data) ? resourceResponse.value.data : []));
const knowledgeItems = computed(() => overlayList('knowledge_items', Array.isArray(knowledgeResponse.value?.data) ? knowledgeResponse.value.data : []));
const servicePage = computed(() => overlayList('pages', servicePageResponse.value?.data || null, (draft: any) => draft.slug === 'service'));
const cmsTopic = computed(() => {
  const sections = Array.isArray(servicePage.value?.sections) ? servicePage.value.sections : [];
  return sections.find((section: any) => section?.id === `service-topic-${topicKey.value}` || section?.topic_key === topicKey.value) || null;
});
const topic = computed<Topic>(() => {
  const base = baseTopic.value as Topic;
  const override = cmsTopic.value || {};
  const steps = Array.isArray(override.steps)
    ? override.steps.map((step: any) => ({ title: String(step?.title || ''), copy: String(step?.copy || step?.description || '') })).filter((step: any) => step.title)
    : base.steps;
  return {
    ...base,
    title: String(override.title || base.title),
    eyebrow: String(override.eyebrow || base.eyebrow),
    description: String(override.description || base.description),
    intro: String(override.intro || base.intro),
    steps,
    ...(override.actionLabel ? { actionLabel: String(override.actionLabel) } : {})
  };
});
const videoCards = computed(() => resources.value.filter((item: any) => item.type === 'video'));
const displaySteps = computed(() => {
  if (!['faults', 'knowledge'].includes(topicKey.value)) return topic.value.steps;
  const category = topicKey.value === 'faults' ? 'fault_analysis' : 'knowledge_share';
  return knowledgeItems.value.filter((item: any) => item.category === category).map((item: any) => ({
    sourceKey: item.source_key,
    title: item.question_title || item.title,
    copy: item.summary || item.symptoms || (Array.isArray(item.troubleshooting_steps) ? item.troubleshooting_steps.join('；') : (Array.isArray(item.steps) ? item.steps.join('；') : ''))
  }));
});

useSeoMeta({ title: () => `${topic.value.title} | 瑞钧智科`, description: () => topic.value.description });
</script>

<template>
  <main class="service-child-page">
    <SiteHeader />
    <section v-if="topicKey !== 'video'" class="service-child-hero">
      <div class="service-child-shell">
        <NuxtLink class="service-back" to="/service">服务支持 /</NuxtLink>
        <p>{{ topic.eyebrow }}</p>
        <h1>{{ topic.title }}</h1>
        <span>{{ topic.description }}</span>
        <small v-if="selectedModel">当前机型：{{ selectedModel }}</small>
      </div>
    </section>

    <section v-if="topicKey === 'video'" class="service-video-section service-video-section--psd">
      <div class="service-child-shell">
        <h1 class="sr-only">{{ topic.title }}</h1>
        <div id="service-video-list" class="service-video-grid">
          <article v-for="card in videoCards" :key="card.source_key || card.title" :data-cms-preview-key="card.source_key">
            <a class="service-video-thumb" :href="card.asset" target="_blank" rel="noopener">
              <img v-if="card.cover_asset" :src="card.cover_asset" :alt="card.cover_alt || card.title"><span aria-hidden="true"></span>
            </a>
            <div><time>{{ card.display_date || '' }}</time><h2>{{ card.title }}</h2></div>
          </article>
        </div>
        <p v-if="!videoCards.length" class="service-empty">暂无已发布的视频教学。</p>
      </div>
    </section>

    <section v-else class="service-topic-section">
      <div class="service-child-shell">
        <p class="service-topic-intro">{{ topic.intro }}</p>
        <ol id="service-knowledge-list" :class="{ 'is-fault-list': topicKey === 'faults' }">
          <li v-for="(step, index) in displaySteps" :key="step.title" :data-cms-preview-key="step.sourceKey">
            <b>{{ String(index + 1).padStart(2, '0') }}</b>
            <div><h2>{{ step.title }}</h2><p>{{ step.copy }}</p></div>
            <span aria-hidden="true">→</span>
          </li>
        </ol>
        <p v-if="!displaySteps.length && ['faults', 'knowledge'].includes(topicKey)" class="service-empty">暂无已发布内容。</p>
        <a v-if="portalUrl" class="service-primary-action" :href="portalUrl" :target="/^https?:\/\//.test(portalUrl) ? '_blank' : undefined" rel="noopener noreferrer">{{ topic.actionLabel }}<span aria-hidden="true">→</span></a>
        <NuxtLink v-else class="service-primary-action" to="/service">返回服务支持<span aria-hidden="true">→</span></NuxtLink>
      </div>
    </section>
    <SiteFooter variant="full" home-psd />
  </main>
</template>

<style scoped>
.service-child-page{min-height:100vh;background:#f2f2f1;color:#252628}.service-child-shell{width:min(78vw,2820px);margin:0 auto}.service-child-hero{padding:154px 0 66px;border-bottom:1px solid #d4d4d2;background:#ededec}.service-back{display:inline-block;margin-bottom:36px;color:#858688;font-size:14px;text-decoration:none}.service-child-hero p{margin:0 0 12px;color:#d81f29;font-size:12px;font-weight:600}.service-child-hero h1{margin:0;font-size:clamp(38px,3.05vw,58px);font-weight:500;line-height:1.1}.service-child-hero span{display:block;max-width:700px;margin-top:18px;color:#66686a;font-size:17px;line-height:1.75}.service-child-hero small{display:inline-block;margin-top:22px;padding:7px 12px;border:1px solid #c4c5c4;border-radius:3px;color:#444;font-size:13px}.service-topic-section,.service-video-section{padding:68px 0 104px}.service-topic-intro,.service-material-note{max-width:880px;margin:0 0 46px;color:#6f7173;font-size:15px;line-height:1.8}.service-topic-section ol{margin:0;padding:0;border-top:1px solid #cbccca;list-style:none}.service-topic-section li{display:grid;grid-template-columns:78px minmax(0,1fr) 26px;align-items:center;gap:24px;min-height:116px;border-bottom:1px solid #cbccca}.service-topic-section li>b{color:#dd202a;font-size:14px;font-weight:500}.service-topic-section li h2{margin:0;font-size:21px;font-weight:500}.service-topic-section li p{margin:8px 0 0;color:#77797b;font-size:14px}.service-topic-section li>span{color:#a7a8a8;font-size:21px}.service-topic-section .is-fault-list li{min-height:91px}.service-topic-section .is-fault-list li p{display:none}.service-primary-action{width:260px;height:54px;display:flex;align-items:center;justify-content:space-between;margin-top:46px;padding:0 22px;border-radius:3px;background:#333436;color:#fff;text-decoration:none}.service-primary-action:hover{background:#df202a}.service-video-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:54px 7.5%;padding-top:2px}.service-video-grid article{min-width:0}.service-video-thumb{position:relative;overflow:hidden;aspect-ratio:838/516;background:#d5d5d3}.service-video-thumb img{width:100%;height:100%;display:block;object-fit:cover}.service-video-thumb span{position:absolute;top:50%;left:50%;width:56px;height:56px;border:2px solid #fff;border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 0 0 6px rgb(255 255 255 / 18%)}.service-video-thumb span::after{content:"";position:absolute;top:50%;left:52%;border-top:10px solid transparent;border-bottom:10px solid transparent;border-left:15px solid #fff;transform:translate(-40%,-50%)}.service-video-grid article>div:last-child{display:grid;grid-template-columns:auto minmax(0,1fr);gap:18px;margin-top:13px}.service-video-grid time{color:#4f75ae;font-size:13px}.service-video-grid h2{overflow:hidden;margin:0;font-size:14px;font-weight:500;white-space:nowrap;text-overflow:ellipsis}.service-pagination{display:flex;align-items:center;justify-content:center;gap:18px;margin-top:62px;font-size:14px}.service-pagination b{color:#d8202a}.service-pagination i{font-style:normal}.service-material-note{margin:36px auto 0;text-align:center}.service-back:hover{color:#d8202a}@media(max-width:900px){.service-child-shell{width:min(100% - 44px,720px)}.service-child-hero{padding:110px 0 48px}.service-child-hero h1{font-size:38px}.service-topic-section,.service-video-section{padding:48px 0 72px}.service-video-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:34px 20px}.service-topic-section li{grid-template-columns:42px minmax(0,1fr);gap:14px;padding:22px 0}.service-topic-section li>span{display:none}}@media(max-width:560px){.service-video-grid{grid-template-columns:1fr}.service-video-grid article>div:last-child{gap:12px}.service-pagination{gap:11px}.service-child-hero span{font-size:15px}}
.service-video-section--psd{padding:168px 0 84px}.service-video-section--psd .service-child-shell{width:min(71.1vw,2732px)}.service-video-section--psd .service-video-grid{column-gap:4%}.service-video-section--psd .service-video-grid article>.service-video-thumb:last-child{display:block;margin-top:0}@media(max-width:900px){.service-video-section--psd{padding:96px 0 72px}.service-video-section--psd .service-child-shell{width:min(100% - 44px,720px)}}
.service-video-thumb{display:block}.service-empty{margin:38px 0;color:#77797b;text-align:center}
</style>
