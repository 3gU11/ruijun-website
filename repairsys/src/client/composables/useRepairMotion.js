import { nextTick, onUnmounted } from 'vue';

export function useRepairMotion() {
  let context;

  async function playPageEntry() {
    await nextTick();
    context?.revert();
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const { gsap } = await import('gsap');
    context = gsap.context(() => {
      const targets = Array.from(document.querySelectorAll('.support-page > section, .support-page > div'))
        .filter((node) => node instanceof HTMLElement && node.offsetParent !== null);
      gsap.from(targets, { autoAlpha: 0, y: 16, duration: 0.42, stagger: 0.045, ease: 'power2.out', clearProps: 'transform,opacity,visibility' });
      const active = document.querySelector('.guide-step.active');
      if (active) gsap.from(active, { scale: 0.96, duration: 0.28, ease: 'back.out(1.6)', clearProps: 'transform' });
      const scanSteps = document.querySelectorAll('.board-identity-steps article');
      if (scanSteps.length) gsap.from(scanSteps, { autoAlpha: 0, x: 12, duration: 0.28, stagger: 0.12, ease: 'power2.out', clearProps: 'transform,opacity,visibility' });
      const currentNode = document.querySelector('.current-service-rail .active, .case-stage-rail .active');
      if (currentNode) gsap.from(currentNode, { scale: 0.98, duration: 0.36, ease: 'power2.out', clearProps: 'transform' });
      const primaryEntry = document.querySelector('.repair-hero-cta');
      if (primaryEntry) {
        gsap.from(primaryEntry, { autoAlpha: 0, x: -14, duration: 0.48, delay: 0.16, ease: 'power2.out', clearProps: 'transform,opacity,visibility' });
        const entryKicker = primaryEntry.closest('.repair-site-hero-actions')?.querySelector('.repair-hero-cta-kicker');
        if (entryKicker) gsap.from(entryKicker, { autoAlpha: 0, x: -22, duration: 0.36, delay: 0.05, ease: 'power2.out', clearProps: 'transform,opacity,visibility' });
        gsap.timeline({ delay: 1.05 })
          .to(primaryEntry, { scale: 1.035, duration: 0.3, ease: 'power2.out' })
          .to(primaryEntry, { scale: 1, duration: 0.42, ease: 'power2.inOut', clearProps: 'transform' });
      }
      document.querySelectorAll('[data-motion-counter]').forEach((node) => {
        const target = Number(node.textContent || 0);
        if (!Number.isFinite(target) || target <= 0) return;
        const value = { current: 0 };
        gsap.to(value, { current: target, duration: 0.5, ease: 'power1.out', onUpdate: () => { node.textContent = String(Math.round(value.current)); } });
      });
    });
  }

  onUnmounted(() => context?.revert());
  return { playPageEntry };
}
