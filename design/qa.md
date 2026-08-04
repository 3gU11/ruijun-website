# Nuxt migration visual and motion QA

Date: 2026-08-03

## Result

READY. The migrated Nuxt routes now match the legacy demo's principal visual structure and desktop GSAP interaction model. No HIGH visual or interaction deviations remain in the checked public routes.

## Baseline and correction

- Source of truth: legacy `demo/`, served at `http://127.0.0.1:4173/`.
- Migrated site: Nuxt 3 production preview at `http://127.0.0.1:4301/`.
- Desktop viewport: `1440 x 900`.
- Mobile viewport: `390 x 844`.
- Artifacts: `website/output/playwright/migration/after/`, `website/output/playwright/migration/milestone-restored/`, and `website/output/playwright/migration/ai-service-restored/`.
- The previous static-first-screen review was insufficient: it could confirm assets and broad layout, but could not prove the legacy scroll state machine, scene transitions, or pinned timeline behavior. This pass validates those intermediate states in a real browser.

## Restored legacy parity

### Homepage

- Restored GSAP `Observer` wheel/touch control and `ScrollToPlugin` full-screen navigation.
- Restored the hero machine cross-panel morph and mask transition.
- Restored the three-step "Why Ruijun" copy reveal.
- Restored three horizontally covering reason scenes, media parallax, layered copy, and scene progress.
- Restored the horizontal history track, arrow cursor, independent copy movement, and four-line title wipe.
- Restored Arrow, PageUp/PageDown, and Space keyboard control plus the right-side section navigator.
- Preserved natural document flow for mobile and `prefers-reduced-motion` users.

### About page

- Restored the light full-screen certificates, honors, patents, factory, and history compositions.
- Restored the GSAP factory mask/zoom transition and layered section entrances.
- Restored the missing customer-site section: five domestic and five overseas images.
- Restored the legacy large heading treatment and red rule.
- Follow-up correction: restored the dedicated legacy footer instead of reusing the generic site footer, including the About links, foreign-trade phone, domestic/foreign email addresses, and after-sales slogan.
- Follow-up correction: restored the complete `200svh` opening composition, with both desktop opening panels measuring one full `100svh` viewport.
- Follow-up correction: restored the 11-stop right-side section navigator, history hint/progress markup, exact image alt labels, and keyboard-operable factory slider.
- Follow-up correction: restored the legacy `3000px` milestone track with six absolutely positioned year nodes, four-line sequential title wipe, red arrow travel, Chinese milestone evidence, and the desktop GSAP Observer state machine.
- History entry and exit now match the legacy interaction: hash entry starts at 0%, reverse entry from the factory starts at 100%, keyboard steps move in 25% increments, and an additional boundary gesture exits the panel.
- Mobile opening dimensions and typography now match the legacy breakpoints: `800px` hero, `720px` legacy panel, and `24px` hero title.

### Other checked routes

- Product: restored the legacy second-screen left-heading/right-description composition; product search remains in a later section.
- Service: restored the legacy hero crop and `52%` dark overlay.
- Manufacturing: retained the legacy first- and second-screen composition without additional changes.
- Product detail, resources, news, and news detail retain the migrated visual system and public BFF boundaries.

### Global AI service

- Restored the legacy branded launcher with online status and the `维修 · 保修 · 进度` service scope.
- Restored the welcome message, four numbered common-service prompts, compact answered-state prompt rail, question composer, loading/stop controls, and close action.
- Restored structured answer cards with numbered steps, notes, optional BFF citations, and answer feedback.
- Restored the `查看下一步` route for repair requests, progress, warranty, sales consultation, and factory visits.
- Restored the approved knowledge for the four-item repair preparation checklist, Changshu/Kunshan factory visits, and direct after-sales support.
- Repair-system actions remain health-gated through the public service-entry endpoint; unavailable services show a disabled action and the verified after-sales phone fallback.
- Preserved focus entry/restoration, Escape dismissal, route visibility behavior, static approved FAQ fallback, and optional BFF streaming mode.

## Dynamic browser evidence

| State | Observed result | Status |
| --- | --- | --- |
| Homepage enters `#reasons` | section top `0px` | PASS |
| Intro after three wheel steps | `intro-stage-3`; item opacity `1, 1, 1` | PASS |
| Reason scene cover | second scene moves from `1440px` to about `261px` | PASS |
| History keyboard entry | `#history` top `0px`; active panel is `history` | PASS |
| History scrub | track `translateX(-1560px)`; copy `translateX(-2827.2px)` | PASS |
| History title wipe | all four lines report `--reveal-progress: 100%` | PASS |
| About customer section | 5 domestic + 5 overseas images | PASS |
| About content structure | 10 main sections + dedicated footer; 11 section-navigation stops | PASS |
| About desktop opening | hero `900px`; legacy panel `900px`; story `1800px` | PASS |
| About history 0/25/50/75/100% | track X `1267.2 / 560.4 / -146.4 / -853.2 / -1560px` | PASS |
| About history title wipe at 25% | four lines `100 / 100 / 100 / 98.599875%` | PASS |
| About history year positions at 50% | left `74 / 554 / 1034 / 1514 / 1994 / 2474px` | PASS |
| About history year positions at 100% | left `-1340 / -860 / -380 / 100 / 580 / 1060px`; arrow X `1255px` | PASS |
| About history boundary protection | first end-wheel gesture remains pinned; continued gesture exits to factory top `0px` | PASS |
| About history reverse entry | factory upward entry restores `1.000`; ArrowLeft moves to `0.750` | PASS |
| About section navigation | history at 50% to factory yields factory top `0px` | PASS |
| About dedicated footer | all legacy links, addresses, phones, emails, and service copy present | PASS |
| Global AI welcome state | branded header, welcome card, 4 numbered prompts, composer, and 2 actions | PASS |
| Global AI approved answer | repair prompt returns title, 3 numbered steps, and reviewed note | PASS |
| Global AI repair preparation | prompt 04 returns the reviewed four-item repair-material checklist | PASS |
| Global AI factory visit answer | Kunshan visit query returns both factory addresses and the visit-preparation note | PASS |
| Global AI factory visit next step | answer routes to `工厂来访咨询` with the sales contact fallback | PASS |
| Global AI direct support knowledge | approved after-sales answer exposes the verified `150 5016 6844` support line | PASS |
| Global AI next step | repair answer routes to the repair application panel; unavailable backend fails closed with phone fallback | PASS |
| Global AI keyboard flow | input receives focus; back restores the FAQ input; Escape closes and restores launcher focus | PASS |
| Browser console | 0 errors, 0 warnings on checked states | PASS |

## Mobile behavior

- Homepage: `scrollWidth === clientWidth === 390`.
- About: `scrollWidth === clientWidth === 390`.
- Homepage reason and history tracks use internal horizontal scrolling; the history GSAP transform is `none`.
- About history, certificates, honors, patents, and both customer rows use internal horizontal scrolling; the history track transform is `none`.
- AI service dialog fits inside a `390 x 844` viewport (`8px` side insets, `96px` top, `774px` bottom) with no horizontal page overflow.
- Desktop pinning and wheel capture are disabled at the mobile breakpoint.

## Content safety

CMS-backed pages continue to render only public BFF responses. Empty states remain visible when no approved content is published; no draft news, product, evidence, resource, or location records were added as visual filler.

## Verification

- Node test suite: `112/112` passing.
- Nuxt production build: PASS.
- Isolated build directory: `website/.nuxt-build-ai-service-final`.
- Production review server on port `4301`: running from the latest `.output`.
- Residual warning: one dependency-owned Node deprecation warning for a trailing-slash package export; compilation and runtime are unaffected.

## Verdict

READY. The final gate includes visual comparison, intermediate GSAP states, keyboard control, mobile fallback, console checks, the complete automated test suite, and a production build.
