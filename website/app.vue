<script setup lang="ts">
import GlobalPageIndicator from './components/GlobalPageIndicator.vue';
import { installCmsFieldPresentationRenderer } from './utils/cms-field-presentation-dom.mjs';
import './assets/fonts.css';

let disposeFieldPresentationRenderer: (() => void) | undefined;

onMounted(() => {
  if (!import.meta.client) return;
  window.history.scrollRestoration = 'manual';
  if (!window.location.hash) window.scrollTo({ left: 0, top: 0, behavior: 'auto' });
  disposeFieldPresentationRenderer = installCmsFieldPresentationRenderer();
});

onBeforeUnmount(() => disposeFieldPresentationRenderer?.());
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtPage />
  <CmsPreviewBar />
  <GlobalPageIndicator />
  <GlobalFaqAssistant />
</template>

<style>
html[data-cms-preview-edit-mode="true"] [data-cms-preview-editable="true"] {
  cursor: move;
  outline: 1px dashed transparent;
  outline-offset: 3px;
}
html[data-cms-preview-edit-mode="true"] [data-cms-preview-key] {
  scroll-margin-top: 180px;
}
/* The fixed public header can overlap the first editable field on a canvas.
   It remains visible for orientation but must not intercept edit-mode clicks. */
html[data-cms-preview-edit-mode="true"] .site-header {
  pointer-events: none;
}
/* Disabled controls suppress native pointer and click events. In the editor,
   let the parent receive the click so the coordinate resolver can select the
   original bound control without changing its public disabled state. */
html[data-cms-preview-edit-mode="true"] button:disabled[data-cms-preview-editable="true"][data-cms-preview-text="true"] {
  pointer-events: none;
}
html[data-cms-preview-edit-mode="true"] [data-cms-preview-editable="true"]:hover,
html[data-cms-preview-edit-mode="true"] [data-cms-preview-editable="true"].cms-preview-dragging,
html[data-cms-preview-edit-mode="true"] [data-cms-preview-editable="true"].cms-preview-editing {
  outline-color: #ed1f2b;
}
html[data-cms-preview-edit-mode="true"] [data-cms-preview-text="true"].cms-preview-editing {
  cursor: text;
  outline-style: solid;
  background: rgb(237 31 43 / 8%);
}
html[data-cms-preview-edit-mode="true"] [data-cms-preview-readonly="media-pending"] {
  cursor: not-allowed;
  outline: 1px dashed rgb(95 101 108 / 85%);
  outline-offset: 3px;
  filter: grayscale(0.3);
}
</style>
