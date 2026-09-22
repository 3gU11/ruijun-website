import type { RouterConfig } from '@nuxt/schema';
import { useNuxtApp } from '#app';

export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    if (to.path === '/product' && to.hash && to.path !== from.path) {
      return new Promise((resolve) => {
        useNuxtApp().hooks.hookOnce('page:loading:end', () => {
          requestAnimationFrame(() => {
            const target = document.querySelector<HTMLElement>(to.hash);
            if (!target) return resolve({ left: 0, top: 0, behavior: 'auto' });
            const rect = target.getBoundingClientRect();
            const top = window.scrollY + rect.top - ((window.innerHeight - rect.height) / 2);
            resolve({ left: 0, top: Math.max(0, top), behavior: 'auto' });
          });
        });
      });
    }
    if (to.hash) return { el: to.hash, behavior: 'auto' };
    // Header navigation is a fresh page entry: do not restore the previous
    // page's scroll position. Hash links above retain their explicit target.
    return { left: 0, top: 0, behavior: 'auto' };
  }
};
