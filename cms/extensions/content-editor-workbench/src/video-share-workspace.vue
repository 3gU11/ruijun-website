<template>
  <section class="video-share-workspace" aria-label="视频分享卡片">
    <header class="vs-heading">
      <div class="vs-heading-copy">
        <p class="eyebrow">视频新闻</p>
        <h3>视频分享</h3>
        <p class="vs-intro">每张视频分享卡片就是一个视频。视频上传后直接进入素材库并发布，不需要送审。</p>
      </div>
      <div class="vs-heading-actions">
        <label class="vs-search">检索<input v-model.trim="search" type="search" placeholder="按标题、文件名或日期筛选"></label>
        <button type="button" class="vs-primary" @click="openCreate">新增视频分享</button>
      </div>
    </header>

    <p v-if="error" class="vs-alert" role="alert">{{ error }}</p>
    <p v-if="message" class="vs-success">{{ message }}</p>

    <div v-if="loading" class="vs-empty"><strong>正在加载视频分享…</strong></div>
    <div v-else-if="!filteredCards.length" class="vs-empty">
      <strong>{{ cards.length ? '没有匹配的视频分享' : '还没有视频分享卡片' }}</strong>
      <p>{{ cards.length ? '换一个关键词试试。' : '可以只上传一个视频，也可以直接选择系统里已经上传的视频。' }}</p>
      <button v-if="!cards.length" type="button" class="vs-primary" @click="openCreate">新增视频分享</button>
    </div>

    <div v-else class="vs-grid">
      <article v-for="card in filteredCards" :key="card.key" class="vs-card">
        <div class="vs-card-media">
          <video
            v-if="card.videoFileId"
            :src="assetUrl(card.videoFileId)"
            :poster="card.posterAssetId ? assetUrl(card.posterAssetId) : undefined"
            muted
            playsinline
            preload="metadata"
          ></video>
          <div v-else class="vs-card-placeholder"><span>未关联视频</span><small>只保留卡片的文字内容</small></div>
          <span class="vs-kind">视频卡片</span>
          <span class="vs-status" :data-status="card.status">{{ statusLabel(card.status) }}</span>
        </div>
        <div class="vs-card-body">
          <h4>{{ card.title }}</h4>
          <p class="vs-card-date">{{ dateLabel(card.date) }}</p>
          <p class="vs-card-meta">{{ card.mediaAsset ? mediaMeta(card.mediaAsset) : '没有关联视频素材' }}</p>
          <div class="vs-card-actions">
            <button type="button" :disabled="!cardEditable(card)" :title="cardEditable(card) ? '修改卡片' : '审核中或待发布的卡片不能直接修改'" @click="openEdit(card)">修改</button>
            <button type="button" class="vs-danger" @click="openDelete(card)">删除</button>
          </div>
        </div>
      </article>
    </div>

    <div v-if="editorOpen && editor" class="vs-backdrop" @click.self="closeEditor">
      <section class="vs-dialog" role="dialog" aria-modal="true" :aria-label="editor.mode === 'create' ? '新增视频分享' : '修改视频分享'">
        <header class="vs-dialog-heading">
          <div>
            <p class="eyebrow">{{ editor.mode === 'create' ? '新增视频分享' : '修改视频分享' }}</p>
            <h3>{{ editor.title || '新的视频分享卡片' }}</h3>
            <p>{{ editor.mode === 'create' ? '先选视频，再填写卡片信息。' : '可以切换视频素材并修改卡片信息。' }}</p>
          </div>
          <button type="button" class="vs-close" aria-label="关闭" @click="closeEditor">×</button>
        </header>

        <div class="vs-dialog-body">
          <p v-if="editorError" class="vs-alert" role="alert">{{ editorError }}</p>

          <section class="vs-block">
            <div class="vs-block-heading">
              <div>
                <h4>视频来源</h4>
                <p>从电脑上传新视频，或直接使用系统里已经上传的媒体资源。</p>
              </div>
            </div>
            <div class="vs-source-tabs" role="tablist" aria-label="视频来源">
              <button type="button" :class="{ active: editor.source === 'file' }" @click="setSource('file')">从电脑选择文件</button>
              <button type="button" :class="{ active: editor.source === 'existing' }" @click="setSource('existing')">使用系统已上传媒体</button>
            </div>

            <div v-if="editor.source === 'file'" class="vs-source-panel">
              <label class="vs-file-picker">
                <span>{{ editor.file ? '重新选择视频文件' : '选择视频文件' }}</span>
                <input type="file" accept="video/mp4,video/webm,.mp4,.webm" @change="selectFile">
              </label>
              <p v-if="editor.file" class="vs-file-note">已选择：{{ editor.file.name }} · {{ readableSize(editor.file.size) }}</p>
              <video v-if="localPreviewUrl" class="vs-source-preview" :src="localPreviewUrl" controls muted playsinline></video>
              <p v-else-if="editor.mediaAssetId" class="vs-file-note">当前视频：{{ editor.fileLabel || `素材 #${editor.mediaAssetId}` }}</p>
              <p v-else-if="editor.mode === 'edit'" class="vs-help">这张卡片当前没有视频。可以继续保存文字卡片，也可以在这里补一个视频。</p>
              <p class="vs-help">支持 MP4 / WebM，最大 500 MB。上传成功即发布，不需要审批。</p>
            </div>

            <div v-else class="vs-source-panel">
              <label class="vs-field">选择已有视频
                <select v-model="editor.mediaAssetId" @change="selectExistingAsset">
                  <option value="">请选择视频素材</option>
                  <option v-if="currentAssetMissing" :value="editor.mediaAssetId">当前视频 #{{ editor.mediaAssetId }}（素材记录未读取）</option>
                  <option v-for="asset in videoOptions" :key="asset.id" :value="String(asset.id)">{{ videoOptionLabel(asset) }}</option>
                </select>
              </label>
              <p v-if="!videoOptions.length" class="vs-help">系统里还没有视频素材，请切换到“从电脑选择文件”上传。</p>
              <video v-if="selectedExistingAsset?.file_id" class="vs-source-preview" :src="assetUrl(selectedExistingAsset.file_id)" controls muted playsinline preload="metadata"></video>
              <p v-if="selectedExistingAsset" class="vs-file-note">{{ selectedExistingAsset.original_file_name }} · {{ mediaMeta(selectedExistingAsset) }}</p>
            </div>
          </section>

          <section class="vs-block">
            <div class="vs-block-heading">
              <div>
                <h4>视频素材必填项</h4>
                <p>和“媒体资产”的上传表单一致；使用范围、展示位置和所属页面已经固定为视频分享。</p>
              </div>
            </div>
            <div class="vs-field-grid">
              <label>使用范围<input value="视频新闻" disabled></label>
              <label>官网展示位置<input value="视频分享列表" disabled></label>
              <label>所属页面<input value="news" disabled></label>
              <label>所属段落<input value="video-sharing" disabled></label>
              <label class="full">素材标题（也是卡片标题）<input v-model.trim="editor.title" maxlength="240" required></label>
              <label>显示顺序<input v-model.number="editor.sort_order" type="number" min="0" step="1"></label>
              <label>版权状态<select v-model="editor.copyright_status" required><option value="owned">自有素材</option><option value="licensed">已获许可</option><option value="authorized">已授权公开</option><option value="pending_review">待确认</option></select></label>
              <label class="toggle-field"><input v-model="editor.enabled" type="checkbox"><span>发布后允许此位置使用</span></label>
              <label class="full">替代文本<textarea v-model.trim="editor.alt_text" rows="2" maxlength="300" placeholder="简要说明画面内容，便于检索与无障碍访问"></textarea></label>
              <label class="full">素材说明<textarea v-model.trim="editor.description" rows="2" maxlength="2000"></textarea></label>
              <label>视频封面<select v-model="editor.poster_asset_id"><option value="">暂不设置（官网显示视频首帧）</option><option v-for="poster in posterOptions" :key="poster.id" :value="String(poster.id)">{{ videoPosterLabel(poster) }}</option></select></label>
              <label class="toggle-field"><input v-model="editor.autoplay" type="checkbox"><span>自动播放</span></label>
              <label class="toggle-field"><input v-model="editor.muted" type="checkbox"><span>默认静音</span></label>
              <label class="toggle-field"><input v-model="editor.loop" type="checkbox"><span>循环播放</span></label>
              <label class="full">字幕或文字稿<textarea v-model.trim="editor.transcript" rows="4" maxlength="30000" placeholder="视频分享可选，可留空"></textarea></label>
              <label class="full">授权与来源说明<textarea v-model.trim="editor.authorization_note" rows="2" maxlength="2000" placeholder="填写拍摄来源、许可证、授权范围或待确认事项"></textarea></label>
            </div>
            <div class="vs-fixed-context">
              <span>使用范围：视频新闻</span>
              <span>官网展示位置：视频分享列表</span>
              <span>所属页面 / 段落：news / video-sharing</span>
            </div>
          </section>

        </div>

        <footer class="vs-dialog-footer">
          <div class="vs-save-state">
            <label>保存名称（上传媒体资源必填）<input v-model.trim="editor.save_name" maxlength="160" placeholder="例如：2026 年 11 月展会视频"></label>
            <small v-if="editorError" class="vs-footer-error" role="alert">{{ editorError }}</small>
            <small v-else :data-tone="saveStateTone">{{ saveStateText }}</small>
          </div>
          <div class="vs-dialog-actions">
            <button type="button" class="vs-secondary" @click="closeEditor">取消</button>
            <button type="button" class="vs-secondary" :disabled="saving" @click="saveContent">{{ saving ? '保存中…' : '保存修改内容' }}</button>
            <button type="button" class="vs-primary" :disabled="saving || !canSaveDraft" :title="saveDraftTitle" @click="saveDraft">{{ saving ? '上传中…' : '上传媒体资源' }}</button>
          </div>
        </footer>
      </section>
    </div>

    <Teleport to="body">
      <div v-if="toast" class="vs-toast" :data-type="toast.type" role="status" aria-live="polite">{{ toast.text }}</div>
    </Teleport>

    <div v-if="deleteOpen && deleteTarget" class="vs-backdrop" @click.self="closeDelete">
      <section class="vs-dialog vs-delete-dialog" role="alertdialog" aria-modal="true" aria-label="删除视频分享">
        <header class="vs-dialog-heading">
          <div>
            <p class="eyebrow">删除视频分享</p>
            <h3>{{ deleteTarget.title }}</h3>
            <p>视频分享只有视频，删除后视频素材和这张卡片会一起从官网移除，不可恢复。</p>
          </div>
          <button type="button" class="vs-close" aria-label="关闭" @click="closeDelete">×</button>
        </header>
        <div class="vs-dialog-body">
          <p v-if="deleteError" class="vs-alert" role="alert">{{ deleteError }}</p>
          <p class="vs-help">如果其他内容还在引用这个视频素材，素材会保留，但这张卡片会消失。</p>
        </div>
        <footer class="vs-dialog-footer vs-delete-footer">
          <span></span>
          <div class="vs-dialog-actions">
            <button type="button" class="vs-secondary" @click="closeDelete">取消</button>
            <button type="button" class="vs-danger-solid" :disabled="deleting" @click="confirmDelete">{{ deleting ? '删除中…' : '确认删除' }}</button>
          </div>
        </footer>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { greatestCommonDivisor } from './draft-shapes.js';
import {
  applyVideoAssetToEditor,
  buildVideoShareCards,
  canEditVideoShareCard,
  formatVideoShareDate,
  isVideoAsset,
  newVideoShareEditor,
  normalizedVideoMime,
  validateVideoShareEditor,
  validateVideoShareFile,
  videoShareEditorFromCard,
  videoShareMediaCreatePayload,
  videoShareMediaUpdatePayload,
  videoShareMediaLabel
} from './video-share-cards.js';

const emit = defineEmits(['changed', 'notify']);
const api = useApi();

const loading = ref(true);
const saving = ref(false);
const deleting = ref(false);
const error = ref('');
const message = ref('');
const search = ref('');
const mediaAssets = ref([]);
const editorOpen = ref(false);
const editor = ref(null);
const editorError = ref('');
const localPreviewUrl = ref('');
const localMetadata = ref({});
const savedFingerprint = ref('');
const editingCardKey = ref('');
const editingMediaAssetId = ref('');
const deleteOpen = ref(false);
const deleteTarget = ref(null);
const deleteError = ref('');
const toast = ref(null);
let toastTimer = 0;

const cards = computed(() => buildVideoShareCards({ mediaAssets: mediaAssets.value }));
const assetsById = computed(() => new Map(mediaAssets.value.map((asset) => [String(asset.id), asset])));
const videoOptions = computed(() => mediaAssets.value
  .filter((asset) => {
    if (!isVideoAsset(asset)) return false;
    const placement = String(asset.placement_key || '');
    const id = String(asset.id || '');
    // Reusing a hero/service video would repurpose its only placement and break
    // that page. Only video-share videos (plus the current legacy asset) are
    // candidates here.
    return !placement || placement === 'news.video_share.list'
      || id === String(editor.value?.mediaAssetId || '')
      || Boolean(cardForMedia(id));
  })
  .slice()
  .sort((left, right) => Number(right.id) - Number(left.id)));
const posterOptions = computed(() => mediaAssets.value
  .filter((asset) => String(asset.media_type || '').toLowerCase() === 'image' || String(asset.mime_type || '').toLowerCase().startsWith('image/'))
  .slice()
  .sort((left, right) => Number(right.id) - Number(left.id)));
const filteredCards = computed(() => {
  const query = search.value.trim().toLowerCase();
  if (!query) return cards.value;
  return cards.value.filter((card) => [
    card.title,
    card.date,
    card.mediaAsset?.original_file_name,
    card.mediaAsset?.title
  ].some((value) => String(value || '').toLowerCase().includes(query)));
});
const selectedExistingAsset = computed(() => assetsById.value.get(String(editor.value?.mediaAssetId || '')) || null);
const currentAssetMissing = computed(() => Boolean(editor.value?.mediaAssetId) && !assetsById.value.has(String(editor.value.mediaAssetId)));
const editorDirty = computed(() => Boolean(savedFingerprint.value) && fingerprint(editor.value) !== savedFingerprint.value);
const canSaveDraft = computed(() => Boolean(
  editor.value
  && savedFingerprint.value
  && !editorDirty.value
  && String(editor.value.save_name || '').trim()
));
const saveStateTone = computed(() => {
  if (!savedFingerprint.value || editorDirty.value) return 'pending';
  return String(editor.value?.save_name || '').trim() ? 'ready' : 'pending';
});
const saveStateText = computed(() => {
  if (!savedFingerprint.value) return '先点击“保存修改内容”，才能上传媒体资源。';
  if (editorDirty.value) return '卡片内容有新修改，请再次点击“保存修改内容”。';
  if (!String(editor.value?.save_name || '').trim()) return '请填写保存名称，再点击“上传媒体资源”。';
  return '修改内容已应用，可以上传媒体资源。';
});
const saveDraftTitle = computed(() => {
  if (!savedFingerprint.value) return '请先保存修改内容';
  if (editorDirty.value) return '请先保存最新修改';
  if (!String(editor.value?.save_name || '').trim()) return '请填写保存名称';
  return '上传媒体资源';
});

function apiError(reason, fallback) {
  const status = reason?.response?.status;
  if (status === 401 || status === 403) return '登录会话已失效或当前账号没有保存权限，请重新登录后再试。';
  return reason?.response?.data?.errors?.[0]?.message || reason?.message || fallback;
}

function showToast(text, type = 'success') {
  toast.value = { text, type };
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.value = null; }, 5000);
}

function notify(text, type = 'success') {
  if (type === 'error') error.value = text;
  else { message.value = text; error.value = ''; }
  showToast(text, type);
  emit('notify', { type, text });
}

function statusLabel(status) {
  return { draft: '草稿', rejected: '退回修改', unpublished: '已下线', review: '审核中', scheduled: '待发布', published: '已发布', archived: '已归档' }[status] || status || '未知';
}

function dateLabel(value) {
  const date = formatVideoShareDate(value);
  if (!date) return '日期待定';
  const [year, month, day] = date.split('-');
  return `${Number(year)}年${Number(month)}月${Number(day)}日`;
}

function readableSize(value) {
  const size = Number(value);
  if (!Number.isFinite(size) || size < 1) return '大小未知';
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${size} B`;
}

function assetUrl(fileId) {
  return fileId ? `/assets/${encodeURIComponent(fileId)}` : '';
}

function mediaMeta(asset) {
  if (!asset) return '';
  const dimensions = Number(asset.width) > 0 && Number(asset.height) > 0 ? `${asset.width}×${asset.height}` : '';
  const duration = Number(asset.duration_seconds) > 0 ? `${asset.duration_seconds} 秒` : '';
  const size = readableSize(asset.byte_size);
  return [dimensions, duration, size].filter(Boolean).join(' · ') || '视频素材';
}

function videoPosterLabel(asset) {
  return `${videoShareMediaLabel(asset)}${asset?.status !== 'published' || asset?.publication_state !== 'published' ? '（未发布）' : ''}`;
}

function cardForMedia(mediaAssetId) {
  return cards.value.find((card) => card.mediaAssetId === String(mediaAssetId)) || null;
}

function videoOptionLabel(asset) {
  const id = String(asset.id);
  const card = cardForMedia(id);
  const suffix = card
    ? (card.key === editingCardKey.value ? '（当前卡片）' : '（已有卡片）')
    : '';
  const placement = String(asset.placement_key || '');
  const placementNote = placement && placement !== 'news.video_share.list' ? ` · ${placement}` : '';
  return `${videoShareMediaLabel(asset)}${suffix}${placementNote}`;
}

function cardEditable(card) {
  return canEditVideoShareCard(card);
}

function fingerprint(value) {
  if (!value) return '';
  const { save_name: ignoredSaveName, localPreviewUrl: ignoredPreview, file, ...rest } = value;
  return JSON.stringify({
    ...rest,
    file: file ? { name: file.name, size: file.size, type: file.type, lastModified: file.lastModified } : null
  });
}

function clearLocalPreview() {
  if (localPreviewUrl.value) URL.revokeObjectURL(localPreviewUrl.value);
  localPreviewUrl.value = '';
}

function resetEditorState() {
  clearLocalPreview();
  editorError.value = '';
  localMetadata.value = {};
  savedFingerprint.value = '';
  editingCardKey.value = '';
  editingMediaAssetId.value = '';
}

function openCreate() {
  resetEditorState();
  editor.value = newVideoShareEditor();
  editorOpen.value = true;
  nextTick(() => {
    const titleInput = document.querySelector('.vs-dialog .vs-field-grid input');
    if (titleInput instanceof HTMLElement) titleInput.focus();
  });
}

function openEdit(card) {
  if (!cardEditable(card)) {
    notify('审核中或待发布的卡片不能直接修改，请先完成审核或退回修改。', 'error');
    return;
  }
  resetEditorState();
  editingCardKey.value = card.key;
  editingMediaAssetId.value = String(card.mediaAssetId || '');
  editor.value = videoShareEditorFromCard(card);
  editorOpen.value = true;
}

function closeEditor() {
  if (saving.value) return;
  resetEditorState();
  editor.value = null;
  editorOpen.value = false;
}

function setSource(source) {
  if (!editor.value || !['file', 'existing'].includes(source) || editor.value.source === source) return;
  const restoreMediaId = String(editor.value.mediaAssetId || editingMediaAssetId.value || '');
  clearLocalPreview();
  editor.value = {
    ...editor.value,
    source,
    mediaAssetId: source === 'existing' ? restoreMediaId : '',
    file: null,
    fileLabel: source === 'existing' ? String(editor.value.fileLabel || '') : '',
    localPreviewUrl: ''
  };
  if (source === 'existing' && restoreMediaId) {
    const asset = assetsById.value.get(restoreMediaId);
    if (asset) editor.value = applyVideoAssetToEditor(editor.value, asset);
  }
  editorError.value = '';
}

async function selectFile(event) {
  const input = event?.target;
  const file = input?.files?.[0] || null;
  if (!file || !editor.value) return;
  const fileError = validateVideoShareFile(file);
  if (fileError) {
    editorError.value = fileError;
    if (input) input.value = '';
    return;
  }
  clearLocalPreview();
  const baseName = String(file.name || '').replace(/\.[^.]+$/, '');
  editor.value = {
    ...editor.value,
    source: 'file',
    file,
    fileLabel: file.name,
    mediaAssetId: '',
    title: String(editor.value.title || '').trim() || baseName
  };
  editorError.value = '';
  localMetadata.value = await readVideoMetadata(file);
  localPreviewUrl.value = URL.createObjectURL(file);
}

function readVideoMetadata(file) {
  if (typeof document === 'undefined' || !file) return Promise.resolve({});
  const url = URL.createObjectURL(file);
  return new Promise((resolve) => {
    const video = document.createElement('video');
    let settled = false;
    const finish = (metadata) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      resolve(metadata);
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const width = Number(video.videoWidth);
      const height = Number(video.videoHeight);
      const divisor = width > 0 && height > 0 ? greatestCommonDivisor(width, height) : 1;
      finish({
        width,
        height,
        duration_seconds: Number.isFinite(video.duration) ? Math.ceil(video.duration) : 0,
        aspect_ratio: width > 0 && height > 0 ? `${width / divisor}:${height / divisor}` : ''
      });
    };
    video.onerror = () => finish({});
    video.src = url;
  });
}

function selectExistingAsset() {
  if (!editor.value) return;
  const assetId = String(editor.value.mediaAssetId || '');
  if (!assetId) return;
  const asset = assetsById.value.get(assetId);
  if (!asset) {
    editorError.value = '没有找到这条视频素材，请重新选择。';
    return;
  }
  const placement = String(asset.placement_key || '');
  if (placement && placement !== 'news.video_share.list' && !cardForMedia(assetId)) {
    editor.value = { ...editor.value, mediaAssetId: String(editingMediaAssetId.value || '') };
    editorError.value = '这个视频已经用于其他官网位置，直接改用途会影响现有页面。请先在“媒体资产”重新上传一条视频分享专用视频。';
    return;
  }
  const linkedCard = cards.value.find((card) => card.mediaAssetId === assetId && card.key !== editingCardKey.value);
  if (linkedCard) {
    if (editor.value.mode === 'create') {
      editingCardKey.value = linkedCard.key;
      editingMediaAssetId.value = assetId;
      editor.value = { ...videoShareEditorFromCard(linkedCard), mode: 'edit' };
      savedFingerprint.value = '';
      notify(`该视频已经有卡片「${linkedCard.title}」，已切换为修改这张卡片。`);
      return;
    }
    editor.value = { ...editor.value, mediaAssetId: String(editingMediaAssetId.value || '') };
    editorError.value = '这个视频已经属于另一张视频分享卡片，不能重复关联。请换一个视频。';
    return;
  }
  clearLocalPreview();
  editor.value = applyVideoAssetToEditor(editor.value, asset);
  editorError.value = '';
}

async function load(silent = false) {
  if (!silent) loading.value = true;
  try {
    const mediaResponse = await api.get('/items/media_assets?fields=id,file_id,original_file_name,title,mime_type,byte_size,usage_scope,media_type,width,height,duration_seconds,aspect_ratio,poster_asset_id,placement_key,page_key,section_key,sort_order,enabled,autoplay,muted,loop,description,transcript,alt_text,copyright_status,authorization_note,status,publication_state,published_at&sort=-id&limit=-1');
    mediaAssets.value = Array.isArray(mediaResponse.data?.data) ? mediaResponse.data.data : [];
    error.value = '';
  } catch (reason) {
    error.value = apiError(reason, '读取视频分享失败，请确认当前账号有内容读取权限。');
  } finally {
    loading.value = false;
  }
}

async function saveContent() {
  const current = editor.value;
  if (!current || saving.value) return;
  const validation = validateVideoShareEditor(current);
  if (validation) {
    editorError.value = validation;
    return;
  }
  saving.value = true;
  editorError.value = '';
  let uploadedMediaId = '';
  const previousMediaId = String(editingMediaAssetId.value || current.mediaAssetId || '');
  let oldMediaWarning = '';
  try {
    let mediaId = String(current.mediaAssetId || '');
    if (current.source === 'file' && !mediaId) {
      const file = current.file;
      if (!file) throw new Error('请选择视频文件。');
      const uploadType = normalizedVideoMime(file);
      const uploadFile = file.type === uploadType ? file : new Blob([file], { type: uploadType });
      const form = new FormData();
      form.append('title', file.name);
      form.append('file', uploadFile, file.name);
      const uploadedResponse = await api.post('/files', form);
      const uploaded = uploadedResponse.data?.data;
      if (!uploaded?.id || !uploaded?.filename_download || !uploaded?.type) throw new Error('上传接口未返回完整的文件信息');
      const mediaPayload = videoShareMediaCreatePayload({ editor: current, file: uploaded, metadata: localMetadata.value });
      const mediaResponse = await api.post('/items/media_assets', mediaPayload);
      mediaId = String(mediaResponse.data?.data?.id || '');
      uploadedMediaId = mediaId;
      if (!mediaId) throw new Error('媒体登记接口没有返回素材 ID。');
      editor.value = {
        ...editor.value,
        source: 'existing',
        mediaAssetId: mediaId,
        file: null,
        fileLabel: uploaded.filename_download,
        localPreviewUrl: ''
      };
      clearLocalPreview();
    } else if (current.source === 'file' && mediaId) {
      // The file was uploaded on a previous attempt; treat it as an existing asset.
      editor.value = { ...editor.value, source: 'existing', mediaAssetId: mediaId };
    } else if (mediaId) {
      const currentAsset = assetsById.value.get(mediaId);
      const keepPlacement = currentAsset
        && currentAsset.placement_key
        && currentAsset.placement_key !== 'news.video_share.list'
        ? {
            placement_key: currentAsset.placement_key,
            page_key: currentAsset.page_key || null,
            section_key: currentAsset.section_key || null,
            usage_scope: currentAsset.usage_scope || 'article'
          }
        : {};
      await api.patch(`/items/media_assets/${encodeURIComponent(mediaId)}`, videoShareMediaUpdatePayload(current, keepPlacement));
    }
    // 视频分享卡片就是媒体素材本身。换成另一条视频后，旧素材必须删除，
    // 否则列表里会多出一张旧卡片。
    if (previousMediaId && mediaId && previousMediaId !== mediaId) {
      try {
        await removeMediaAsset(previousMediaId);
      } catch (reason) {
        oldMediaWarning = apiError(reason, '旧视频素材仍被其他内容引用，未删除。');
      }
    }
    editingMediaAssetId.value = mediaId;
    await load(true);
    editor.value = {
      ...editor.value,
      mode: 'edit',
      source: 'existing',
      file: null,
      localPreviewUrl: ''
    };
    savedFingerprint.value = fingerprint(editor.value);
    if (oldMediaWarning) notify(oldMediaWarning, 'error');
    else notify('卡片内容已保存。请填写保存名称，再点击“上传媒体资源”。');
    emit('changed');
  } catch (reason) {
    if (uploadedMediaId) {
      await load(true);
      emit('changed');
    }
    editorError.value = apiError(reason, '保存视频分享内容失败，内容没有更新。');
  } finally {
    saving.value = false;
  }
}

async function saveDraft() {
  const current = editor.value;
  if (!current || saving.value) return;
  const name = String(current.save_name || '').trim();
  if (!savedFingerprint.value || editorDirty.value) {
    editorError.value = '请先点击“保存修改内容”，确认最新修改后再上传媒体资源。';
    return;
  }
  if (!name) {
    editorError.value = '请填写保存名称，再上传媒体资源。';
    return;
  }
  saving.value = true;
  editorError.value = '';
  try {
    if (!current.mediaAssetId) throw new Error('没有可保存的视频素材。');
    await api.patch(`/items/media_assets/${encodeURIComponent(current.mediaAssetId)}`, { submission_name: name });
    const success = `媒体资源已上传，保存名称：${name}`;
    notify(success);
    closeEditor();
    await load(true);
    emit('changed');
  } catch (reason) {
    editorError.value = apiError(reason, '上传媒体资源失败，内容没有更新。');
  } finally {
    saving.value = false;
  }
}

function openDelete(card) {
  deleteTarget.value = card;
  deleteError.value = '';
  deleteOpen.value = true;
}

function closeDelete() {
  if (deleting.value) return;
  deleteOpen.value = false;
  deleteTarget.value = null;
  deleteError.value = '';
}

async function removeMediaAsset(mediaAssetId) {
  await api.post('/media-poster/asset/delete', { media_asset_id: String(mediaAssetId) });
}

async function confirmDelete() {
  const card = deleteTarget.value;
  if (!card || deleting.value) return;
  deleting.value = true;
  deleteError.value = '';
  try {
    if (!card.mediaAssetId) throw new Error('这条视频分享没有可删除的素材记录。');
    await removeMediaAsset(card.mediaAssetId);
    deleteOpen.value = false;
    deleteTarget.value = null;
    await load(true);
    emit('changed');
    notify(`已删除视频分享「${card.title}」。`);
  } catch (reason) {
    deleteError.value = apiError(reason, '删除失败，内容没有变化。');
  } finally {
    deleting.value = false;
  }
}

onMounted(load);
onBeforeUnmount(() => {
  window.clearTimeout(toastTimer);
  clearLocalPreview();
});

defineExpose({ openCreate, refresh: () => load(false) });
</script>

<style scoped>
.video-share-workspace{display:flex;flex-direction:column;gap:16px;min-width:0;width:100%}
.vs-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;flex-wrap:wrap;border:1px solid var(--theme--border-color);border-radius:8px;background:var(--theme--background);padding:18px 20px}
.vs-heading h3{margin:4px 0 6px;font-size:24px}
.vs-heading-copy{display:grid;gap:2px;max-width:760px}
.vs-intro{margin:0;color:var(--theme--foreground-subdued);line-height:1.55}
.vs-heading-actions{display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap}
.vs-search{display:grid;gap:5px;color:var(--theme--foreground-subdued);font-size:12px}
.vs-search input,.vs-field input:not([type="checkbox"]),.vs-field select,.vs-field textarea,.vs-file-picker input,.vs-save-state input{border:1px solid var(--theme--border-color);border-radius:5px;background:var(--theme--background);color:var(--theme--foreground);padding:8px 9px;font:inherit;font-size:13px;box-sizing:border-box}
.vs-search input{min-width:220px}
.vs-primary,.vs-secondary,.vs-danger,.vs-danger-solid{border:1px solid var(--theme--border-color);border-radius:5px;background:var(--theme--background);color:var(--theme--foreground);padding:9px 14px;font:inherit;cursor:pointer}
.vs-primary{background:var(--theme--primary);border-color:var(--theme--primary);color:var(--theme--primary-contrast, #fff);font-weight:600}
.vs-secondary:hover,.vs-card-actions button:hover{background:var(--theme--background-accent)}
.vs-primary:disabled,.vs-secondary:disabled,.vs-danger-solid:disabled,.vs-card-actions button:disabled{cursor:not-allowed;opacity:.5}
.vs-danger,.vs-danger-solid{color:var(--theme--danger);border-color:var(--theme--danger)}
.vs-danger-solid{background:var(--theme--danger);color:#fff;font-weight:600}
.vs-alert{margin:0;border:1px solid var(--theme--danger);border-radius:6px;background:var(--theme--background);color:var(--theme--danger);padding:10px 12px;font-size:13px}
.vs-success{margin:0;border:1px solid var(--theme--success);border-radius:6px;background:var(--theme--background);color:var(--theme--success);padding:10px 12px;font-size:13px}
.vs-empty{display:grid;place-items:center;gap:8px;border:1px dashed var(--theme--border-color);border-radius:8px;background:var(--theme--background);padding:44px 20px;text-align:center;color:var(--theme--foreground-subdued)}
.vs-empty strong{color:var(--theme--foreground);font-size:17px}
.vs-empty p{margin:0}
.vs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
.vs-card{display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--theme--border-color);border-radius:8px;background:var(--theme--background)}
.vs-card-media{position:relative;aspect-ratio:16/9;background:#101318;overflow:hidden}
.vs-card-media video{display:block;width:100%;height:100%;object-fit:cover}
.vs-card-placeholder{display:grid;place-content:center;gap:5px;width:100%;height:100%;color:#c7cbd1;text-align:center;background:linear-gradient(135deg,#1c222b,#2c343f)}
.vs-card-placeholder small{color:#9ca3ae}
.vs-kind,.vs-status{position:absolute;z-index:1;top:9px;border-radius:999px;padding:4px 8px;font-size:11px;line-height:1.2;background:rgb(10 12 16 / 78%);color:#fff;backdrop-filter:blur(4px)}
.vs-kind{left:9px}
.vs-status{right:9px}
.vs-status[data-status="draft"]{background:rgb(90 96 106 / 88%)}
.vs-status[data-status="review"],.vs-status[data-status="scheduled"]{background:rgb(196 126 22 / 90%)}
.vs-status[data-status="published"]{background:rgb(30 132 73 / 90%)}
.vs-status[data-status="rejected"],.vs-status[data-status="unpublished"]{background:rgb(178 48 48 / 90%)}
.vs-card-body{display:flex;flex:1;flex-direction:column;gap:6px;padding:13px 14px 14px}
.vs-card-body h4{margin:0;font-size:15px;line-height:1.4;overflow-wrap:anywhere}
.vs-card-date{margin:0;color:var(--theme--foreground-subdued);font-size:12px}
.vs-card-meta{margin:0;color:var(--theme--foreground-subdued);font-size:12px;line-height:1.45;overflow-wrap:anywhere}
.vs-card-actions{display:flex;gap:7px;margin-top:auto;padding-top:8px}
.vs-card-actions button{border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);padding:6px 10px;font:inherit;font-size:12px;cursor:pointer}
.vs-card-actions .vs-danger{color:var(--theme--danger)}
.vs-backdrop{position:fixed;inset:0;z-index:120;display:flex;align-items:flex-start;justify-content:center;overflow:auto;background:rgb(12 15 20 / 62%);padding:28px 16px}
.vs-dialog{width:min(980px,100%);margin:auto;border-radius:10px;background:var(--theme--background);box-shadow:0 24px 80px rgb(0 0 0 / 32%);overflow:hidden}
.vs-dialog-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border-bottom:1px solid var(--theme--border-color);padding:18px 20px}
.vs-dialog-heading h3{margin:4px 0 5px;font-size:21px}
.vs-dialog-heading p:last-child{margin:0;color:var(--theme--foreground-subdued);font-size:13px}
.vs-close{display:grid;place-items:center;width:32px;height:32px;border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);font-size:22px;line-height:1;cursor:pointer}
.vs-dialog-body{display:grid;gap:16px;padding:18px 20px;max-height:calc(100vh - 250px);overflow:auto}
.vs-block{display:grid;gap:12px;border:1px solid var(--theme--border-color);border-radius:8px;padding:14px}
.vs-block-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
.vs-block-heading h4{margin:0 0 4px;font-size:15px}
.vs-block-heading p{margin:0;color:var(--theme--foreground-subdued);font-size:12px;line-height:1.5}
.vs-source-tabs{display:flex;gap:8px;flex-wrap:wrap}
.vs-source-tabs button{border:1px solid var(--theme--border-color);border-radius:999px;background:var(--theme--background);color:var(--theme--foreground-subdued);padding:7px 13px;font:inherit;font-size:13px;cursor:pointer}
.vs-source-tabs button.active{border-color:var(--theme--primary);background:var(--theme--background-accent);color:var(--theme--primary);font-weight:600}
.vs-source-panel{display:grid;gap:10px}
.vs-file-picker{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px dashed var(--theme--border-color);border-radius:6px;background:var(--theme--background-accent);padding:12px 14px;cursor:pointer;color:var(--theme--foreground)}
.vs-file-picker input{margin:0;max-width:58%}
.vs-file-note{margin:0;color:var(--theme--foreground-subdued);font-size:12px;overflow-wrap:anywhere}
.vs-help{margin:0;color:var(--theme--foreground-subdued);font-size:12px;line-height:1.5}
.vs-source-preview{display:block;width:100%;max-height:280px;border-radius:6px;background:#101318;object-fit:contain}
.vs-field-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
.vs-field-grid .full{grid-column:1/-1}
.vs-field,.vs-field-grid label,.vs-save-state label{display:grid;gap:5px;color:var(--theme--foreground-subdued);font-size:12px}
.vs-field-grid input:not([type="checkbox"]),.vs-field-grid select,.vs-field-grid textarea{width:100%;border:1px solid var(--theme--border-color);border-radius:5px;background:var(--theme--background);color:var(--theme--foreground);padding:8px 9px;font:inherit;font-size:13px;box-sizing:border-box}
.vs-field-grid textarea{resize:vertical;line-height:1.5}
.vs-field-grid .toggle-field{display:flex !important;align-items:center;gap:8px;color:var(--theme--foreground);font-size:13px}
.vs-field-grid .toggle-field input{width:auto}
.vs-fixed-context{display:flex;gap:8px;flex-wrap:wrap;border-radius:6px;background:var(--theme--background-accent);padding:9px 11px;color:var(--theme--foreground-subdued);font-size:12px}
.vs-fixed-context span{border-right:1px solid var(--theme--border-color);padding-right:8px}
.vs-fixed-context span:last-child{border-right:0;padding-right:0}
.vs-badge{border:1px solid var(--theme--border-color);border-radius:999px;padding:4px 9px;color:var(--theme--foreground-subdued);font-size:11px;white-space:nowrap}
.vs-dialog-footer{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;border-top:1px solid var(--theme--border-color);padding:14px 20px;background:var(--theme--background)}
.vs-save-state{display:grid;gap:4px;flex:1;max-width:420px}
.vs-save-state small{font-size:12px}
.vs-save-state small[data-tone="ready"]{color:var(--theme--success)}
.vs-save-state small[data-tone="pending"]{color:var(--theme--foreground-subdued)}
.vs-save-state .vs-footer-error{color:var(--theme--danger);line-height:1.4;overflow-wrap:anywhere}
.vs-toast{position:fixed;left:50%;bottom:34px;z-index:300;transform:translateX(-50%);max-width:min(640px,90vw);border-radius:8px;background:#1f7a4d;color:#fff;box-shadow:0 12px 34px rgb(0 0 0 / 32%);padding:12px 18px;font-size:14px;line-height:1.45;text-align:center}
.vs-toast[data-type="error"]{background:#a92d2d}
.vs-dialog-actions{display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end}
.vs-delete-dialog{max-width:620px}
.vs-delete-footer{align-items:center}
@media(max-width:760px){
  .vs-heading{align-items:stretch}
  .vs-heading-actions{align-items:stretch;flex-direction:column}
  .vs-search input{min-width:0;width:100%}
  .vs-grid{grid-template-columns:1fr}
  .vs-field-grid{grid-template-columns:1fr}
  .vs-dialog-footer{align-items:stretch;flex-direction:column}
  .vs-save-state{max-width:none}
  .vs-dialog-actions{justify-content:stretch}
  .vs-dialog-actions button{flex:1}
  .vs-block-heading{flex-direction:column;gap:8px}
}
</style>
