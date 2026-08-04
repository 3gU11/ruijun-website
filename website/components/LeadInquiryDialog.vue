<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false });
const route = useRoute();
const dialog = ref<HTMLDialogElement>();
const form = reactive({ name: '', phone: '', leadType: 'selection', requirement: '', consent: false });
const selectedFiles = ref<File[]>([]);
const submitting = ref(false);
const status = ref('');
const statusKind = ref<'idle' | 'error' | 'success'>('idle');

function syncDialog() {
  if (!dialog.value) return;
  if (open.value && !dialog.value.open) dialog.value.showModal();
  if (!open.value && dialog.value.open) dialog.value.close();
}

function close() {
  open.value = false;
}

function onNativeClose() {
  open.value = false;
}

function onBackdrop(event: MouseEvent) {
  if (event.target === dialog.value) close();
}

function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  selectedFiles.value = Array.from(input.files || []).slice(0, 3);
}

async function uploadAttachments() {
  return Promise.all(selectedFiles.value.map(async (file) => {
    const intentResponse = await fetch('/api/public/v1/lead-attachments', {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, mimeType: file.type, byteSize: file.size })
    });
    const intent = await intentResponse.json();
    if (!intentResponse.ok) throw new Error(intent?.message || '附件初始化失败，请重新选择文件。');
    const uploadResponse = await fetch(intent.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
    const upload = await uploadResponse.json();
    if (!uploadResponse.ok) throw new Error(upload?.message || '附件上传失败，请重新选择文件。');
    return intent.attachmentReference;
  }));
}

async function submit() {
  if (!form.name.trim() || !form.phone.trim()) {
    statusKind.value = 'error';
    status.value = '请填写称呼和联系电话。';
    return;
  }
  if (!form.consent) {
    statusKind.value = 'error';
    status.value = '请先同意使用以上信息处理本次咨询。';
    return;
  }
  submitting.value = true;
  statusKind.value = 'idle';
  status.value = '正在提交...';
  try {
    const attachmentReferences = await uploadAttachments();
    const response = await fetch('/api/public/v1/leads', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone,
        leadType: form.leadType,
        requirement: form.requirement,
        consent: form.consent,
        pagePath: route.path,
        attachmentReferences
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result?.message || '提交失败，请稍后再试。');
    statusKind.value = 'success';
    status.value = '需求已提交，销售顾问将尽快与您联系。';
    form.name = '';
    form.phone = '';
    form.leadType = 'selection';
    form.requirement = '';
    form.consent = false;
    selectedFiles.value = [];
  } catch (error) {
    statusKind.value = 'error';
    status.value = error instanceof Error ? error.message : '提交失败，请稍后再试。';
  } finally {
    submitting.value = false;
  }
}

watch(open, syncDialog);
onMounted(syncDialog);
</script>

<template>
  <dialog ref="dialog" class="lead-dialog" aria-labelledby="lead-dialog-title" @close="onNativeClose" @click="onBackdrop">
    <section class="lead-dialog-panel">
      <button class="lead-dialog-close" type="button" aria-label="关闭询盘窗口" @click="close">x</button>
      <p class="lead-dialog-kicker">CONTACT RUIJUN</p>
      <h2 id="lead-dialog-title">获取选型建议</h2>
      <p class="lead-dialog-intro">留下加工任务与联系方式，销售顾问将据此与您沟通。</p>
      <form @submit.prevent="submit">
        <label>附件（PDF、JPG、PNG、WebP，最多 3 个，每个不超过 10 MiB）<input name="attachments" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple @change="onFilesSelected"></label>
        <label>称呼<input v-model="form.name" name="name" autocomplete="name" maxlength="80" required></label>
        <label>联系电话<input v-model="form.phone" name="phone" inputmode="tel" autocomplete="tel" maxlength="32" required></label>
        <label>咨询类型
          <select v-model="form.leadType" name="leadType">
            <option value="selection">设备选型</option>
            <option value="quote">报价咨询</option>
            <option value="sample">打样/图纸评估</option>
            <option value="partner">渠道合作</option>
            <option value="other">其他销售咨询</option>
          </select>
        </label>
        <label>加工需求<textarea v-model="form.requirement" name="requirement" rows="3" maxlength="2000" placeholder="工件尺寸、材料、精度或自动化需求"></textarea></label>
        <label class="lead-dialog-consent"><input v-model="form.consent" name="consent" type="checkbox">我同意瑞钧使用以上信息处理本次选型咨询。</label>
        <p class="lead-dialog-status" :class="`is-${statusKind}`" role="status" aria-live="polite">{{ status }}</p>
        <button class="lead-dialog-submit" type="submit" :disabled="submitting">{{ submitting ? '提交中...' : '提交需求' }}</button>
      </form>
    </section>
  </dialog>
</template>

<style scoped>
.lead-dialog { width: min(520px, calc(100vw - 32px)); padding: 0; color: #f7f8f8; background: rgb(19 22 24 / 88%); border: 1px solid rgb(255 255 255 / 27%); border-radius: 8px; box-shadow: 0 28px 80px rgb(0 0 0 / 52%); backdrop-filter: blur(20px); }
.lead-dialog::backdrop { background: rgb(0 0 0 / 66%); backdrop-filter: blur(5px); }
.lead-dialog-panel { position: relative; padding: 34px; }
.lead-dialog-close { position: absolute; top: 12px; right: 12px; width: 34px; height: 34px; color: #fff; background: rgb(255 255 255 / 9%); border: 1px solid rgb(255 255 255 / 20%); border-radius: 50%; font-size: 18px; cursor: pointer; }
.lead-dialog-kicker { margin: 0; color: #e84b42; font-size: 12px; }
h2 { margin: 12px 0 8px; font-size: 32px; font-weight: 500; }
.lead-dialog-intro { margin: 0 0 24px; color: rgb(255 255 255 / 70%); line-height: 1.65; }
form { display: grid; gap: 15px; }
label { display: grid; gap: 7px; color: rgb(255 255 255 / 83%); font-size: 13px; }
input, select, textarea { box-sizing: border-box; width: 100%; padding: 11px 12px; color: #fff; background: rgb(255 255 255 / 8%); border: 1px solid rgb(255 255 255 / 20%); border-radius: 5px; font: inherit; }
select option { color: #111; }
textarea { resize: vertical; }
input:focus, select:focus, textarea:focus { outline: 2px solid #f15a4f; outline-offset: 1px; }
.lead-dialog-consent { display: flex; align-items: flex-start; gap: 9px; line-height: 1.5; }
.lead-dialog-consent input { width: 16px; height: 16px; margin-top: 2px; }
.lead-dialog-status { min-height: 20px; margin: 0; font-size: 13px; }
.lead-dialog-status.is-error { color: #ff948c; }
.lead-dialog-status.is-success { color: #83d6a8; }
.lead-dialog-submit { min-height: 46px; color: #fff; background: #d93730; border: 0; border-radius: 5px; font: inherit; cursor: pointer; }
.lead-dialog-submit:disabled { cursor: wait; opacity: .68; }
@media (max-width: 520px) { .lead-dialog-panel { padding: 28px 22px; } h2 { font-size: 28px; } }
</style>
