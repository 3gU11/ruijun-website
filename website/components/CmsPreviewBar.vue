<script setup lang="ts">
const route = useRoute();
const { enabled, session, error, liveConnected, livePreviewLabel } = useCmsDraftPreview();
const label = computed(() => livePreviewLabel.value || session.value?.target?.label || session.value?.preview?.title || session.value?.preview?.name || '当前草稿');

async function exitPreview() {
  await $fetch('/api/preview/session', { method: 'DELETE' }).catch(() => undefined);
  await navigateTo(route.path);
}

onMounted(() => {
  if (!enabled.value) return;
  document.body.classList.add('cms-preview-active');
  const focusTarget = () => {
    const selector = session.value?.target?.selector || '';
    const id = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    let target: HTMLElement | null = null;
    try { target = selector ? document.querySelector<HTMLElement>(selector) : null; } catch { /* Fall back to the public page anchor. */ }
    target ||= id ? document.getElementById(id) : null;
    if (!target) return;
    target.scrollIntoView({ block: 'center', behavior: 'auto' });
    target.setAttribute('data-cms-preview-focus', 'true');
  };
  [250, 700, 1400].forEach((delay) => window.setTimeout(focusTarget, delay));
});

onBeforeUnmount(() => document.body.classList.remove('cms-preview-active'));
</script>

<template>
  <aside v-if="enabled" class="cms-preview-bar" role="status">
    <div><strong>{{ error ? '预览已失效' : liveConnected ? '实时预览' : '草稿预览' }}</strong><span>{{ error ? '请回到 CMS 重新打开预览' : liveConnected ? `${label} · 正在同步未保存修改` : `${label} · 修改不会公开` }}</span></div>
    <button type="button" @click="exitPreview">退出预览</button>
  </aside>
</template>

<style scoped>
.cms-preview-bar{position:fixed;z-index:100000;right:18px;bottom:18px;display:flex;align-items:center;gap:22px;max-width:min(520px,calc(100vw - 36px));padding:11px 12px 11px 16px;border:1px solid rgb(255 255 255 / 18%);border-radius:6px;background:rgb(24 26 28 / 94%);box-shadow:0 10px 28px rgb(0 0 0 / 24%);color:#fff;font-family:var(--ruijun-font-cn);backdrop-filter:blur(10px)}
.cms-preview-bar div{display:grid;gap:2px;min-width:0}.cms-preview-bar strong{font-size:13px}.cms-preview-bar span{overflow:hidden;color:rgb(255 255 255 / 68%);font-size:12px;white-space:nowrap;text-overflow:ellipsis}.cms-preview-bar button{flex:none;padding:7px 10px;border:1px solid rgb(255 255 255 / 30%);border-radius:3px;background:transparent;color:#fff;font:inherit;font-size:12px;cursor:pointer}.cms-preview-bar button:hover{background:#fff;color:#17191b}
@media(max-width:560px){.cms-preview-bar{left:12px;right:12px;bottom:12px;justify-content:space-between}}
</style>

<style>
body.cms-preview-active [data-cms-preview-focus="true"]{outline:3px solid #e1262f!important;outline-offset:6px;animation:cms-preview-pulse 1.8s ease 2}
@keyframes cms-preview-pulse{50%{outline-color:rgb(225 38 47 / 20%);outline-offset:12px}}
</style>
