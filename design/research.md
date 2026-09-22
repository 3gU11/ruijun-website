# Homepage Three-Reasons Scroll Research

flow: Desktop wheel-controlled transition between three full-viewport reason scenes.

reference:
- NANFU Global homepage: https://www.nanfu.global/
- Production stylesheet: https://www.nanfu.global/templates/assets/index.78d8c051.css?v=24
- Production script: https://www.nanfu.global/templates/assets/index.091b56b7.js?v=19

verified DOM pattern:
- `.row.r1` is a document-flow scroll range sized from viewport height (`data-vh="3.5"`).
- `.inner.r1SwApp` is `position: sticky`, `height: 100vh`, and `overflow: hidden`.
- `.tabBox.swiper-wrapper` is one independent `position: absolute; z-index: 10` overlay under the sticky container.
- The tab overlay is a sibling of `.mid`, not a child of any clipped reason scene, so its labels remain intact while scenes transition.
- Each `.group.tabParent` is `position: absolute; inset: 0` so scenes are stacked rather than arranged side by side.
- Earlier scenes use a higher z-index than later scenes.

verified motion pattern:
- The site bundles Lenis `0.2.28` as its smooth-scroll controller.
- It initializes Lenis with `duration: 1.3`.
- Its default interpolation is `min(1, 1.001 - 2^(-10t))`, an exponential chase toward the accumulated target scroll position.
- GSAP ScrollTrigger maps real vertical scroll distance continuously with `scrub: .9`.
- The outgoing scene is driven through CSS variable `--go`.
- The `pageFn` keyframe changes `clip-path` from `inset(0)` to `inset(0 100vw 0 0)`.
- This clips the current scene from right to left and reveals the next full-size scene underneath.
- There is no wheel-stop snap to an integer slide.
- ScrollTrigger uses `scrub: .9`, so visual progress trails the physical wheel input instead of matching it immediately.
- The scene state changes around viewport-sized trigger boundaries, which gives complete scenes perceptible boundary weight before the next reveal develops.

application to Ruijun:
- Render the three reason tabs once as a high-z-index overlay directly under `.reason-showcase`, outside `.reason-horizontal-track` and every clipped `.reason-scene`.
- Update only the overlay's active state during scene progress; do not translate or clip the overlay with scene media.
- Preserve continuous wheel-driven progress.
- Stack all three reason scenes at exactly one viewport size.
- Replace incoming `translateX(100%)` movement with outgoing right-edge clipping.
- Do not use stop-time snapping that moves the scene after the gesture has ended.
- Use a small in-motion magnetic range and a short release distance at complete-scene boundaries; this is distinct from forcing a snap after the gesture stops.
- Keep a separate accumulated target and rendered progress. Rendered progress follows the target with the same 1.3-second exponential decay used by NANFU's Lenis controller, producing momentum rather than a fixed delay.
- Give every complete lifecycle panel an additional `180px` directional scroll range before leaving it. This creates a consistent boundary dwell without a timer or blocked input.
- Keep short internal intro-copy steps at `58px`; only crossing from one full panel to another uses the longer boundary range.
- Keep the existing Observer panel lifecycle for now; only adopt NANFU's scene-composition method to avoid expanding the change into a full homepage scroll architecture rewrite.
