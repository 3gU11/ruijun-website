import { assessKnowledgeLifecycleReadiness } from '../content-workflow/knowledge-governance.mjs';
import { isAuthorizationConfirmed } from './website-evidence-review-rules.mjs';

const knowledgeFieldLabels = Object.freeze({
  source_key: '来源键',
  source_document: '来源文件',
  category: '分类',
  question_title: '问题标题',
  troubleshooting_steps: '排障步骤',
  risk_level: '风险等级',
  version: '版本',
  technical_reviewer: '技术审核责任人',
  visibility: '可见范围',
  channel: '渠道'
});

function text(value) {
  return typeof value === 'string' ? value.normalize('NFKC').trim() : '';
}

function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function hasRecordValues(value) {
  return Object.values(record(value)).some((item) => item != null && (typeof item !== 'string' || item.trim()));
}

export function assessProductParameter(value) {
  const issues = [];
  if (!text(value?.model_code)) issues.push('型号编码');
  if (!text(value?.field_name)) issues.push('参数字段');
  if (!text(value?.value)) issues.push('参数值');
  return issues;
}

export function assessCaseStudy(value) {
  const issues = [];
  if (!text(value?.slug)) issues.push('案例标识');
  if (!text(value?.industry)) issues.push('行业');
  if (!text(value?.material)) issues.push('材料');
  if (!text(value?.thickness)) issues.push('厚度');
  if (!text(value?.model_code)) issues.push('型号编码');
  if (!text(value?.process)) issues.push('工艺过程');
  if (!text(value?.result)) issues.push('结果');
  if (!isAuthorizationConfirmed(value?.authorization_status)) issues.push('客户授权待确认');
  return issues;
}

export function assessArticle(value) {
  const issues = [];
  if (!text(value?.slug)) issues.push('文章标识');
  if (!text(value?.category)) issues.push('分类');
  if (!text(value?.title)) issues.push('标题');
  // 动态新闻不再维护独立摘要；正文和 SEO 描述承担导语/搜索描述职责。
  // 视频分享现在把视频存在受管 media[] 里，不再写 video_url；
  // 只认 video_url 会把“已有视频”的文章误判为缺少正文/视频。
  const media = Array.isArray(value?.media) ? value.media : [];
  const videoCategory = text(value?.category).toLowerCase() === 'video';
  const hasGovernedVideo = media.some((entry) => {
    const mediaType = String(entry?.mediaType || entry?.media_type || '').trim().toLowerCase();
    const mimeType = String(entry?.mimeType || entry?.mime_type || '').trim().toLowerCase();
    if (mediaType === 'video' || mimeType.startsWith('video/')) return true;
    // 数据库里的文章媒体只存 media_asset_id，不一定带类型；视频分类按视频处理。
    return videoCategory && Boolean(entry?.media_asset_id) && !mediaType && !mimeType;
  });
  if (!text(value?.body) && !text(value?.video_url) && !hasGovernedVideo) issues.push('正文或视频');
  // 视频分享的封面是可选项：官网详情页会回退到视频海报/首帧。
  // 图文新闻仍需要封面，因为列表卡片用它当缩略图。
  if (!text(value?.cover_asset) && text(value?.category).toLowerCase() !== 'video') issues.push('封面媒体');
  if (!hasRecordValues(value?.seo)) issues.push('SEO 信息');
  return issues;
}

export function assessPublicKnowledge(value) {
  const assessment = assessKnowledgeLifecycleReadiness({ current: value, target: 'published' });
  const issues = assessment.missing.map((field) => knowledgeFieldLabels[field] || field);
  if (assessment.requiresHighRiskSafety) issues.push('高风险安全前置条件与人工升级说明');
  if (assessment.requiresPublicVisibility) issues.push('仅公开知识可发布');
  return issues;
}
