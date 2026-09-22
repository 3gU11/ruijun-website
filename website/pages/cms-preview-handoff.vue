<script setup lang="ts">
const message = ref('正在建立草稿预览会话...');

onMounted(async () => {
  const hash = String(window.location.hash || '').replace(/^#/, '');
  const token = new URLSearchParams(hash).get('cmsPreviewToken') || '';
  window.history.replaceState(null, '', window.location.pathname);
  if (!token) {
    message.value = '预览令牌不存在或已失效。请回到 CMS 重新打开预览。';
    return;
  }
  try {
    const created = await fetch('/api/preview/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    if (!created.ok) throw new Error('Preview session was rejected');
    const session = await fetch('/api/preview/session');
    if (!session.ok) throw new Error('Preview session was not created');
    const result = await session.json() as { data?: { target?: { path?: string; hash?: string } } };
    const target = result.data?.target;
    const path = String(target?.path || '/');
    const location = `${path}${path.includes('?') ? '&' : '?'}cmsPreview=1${target?.hash ? `#${encodeURIComponent(target.hash)}` : ''}`;
    await navigateTo(location, { replace: true });
  } catch {
    message.value = '无法建立草稿预览会话。请回到 CMS 重新打开预览。';
  }
});
</script>

<template><main class="preview-opening"><p>{{ message }}</p></main></template>

<style scoped>
.preview-opening { display: grid; min-height: 100svh; place-items: center; margin: 0; padding: 24px; color: #17191b; background: #f2f2ef; font: 16px/1.5 Arial, 'Microsoft YaHei', sans-serif; }
</style>
