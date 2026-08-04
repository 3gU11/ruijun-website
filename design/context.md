# Context

goal: Complete the website migration from the existing `demo/` frontend to `website/` Nuxt without losing the pre-migration visual presentation or interactions.
user: Prospective machine-tool customers using desktop and mobile browsers to inspect products, manufacturing capability, company credentials, and service options.
JTBD: Browse the same complete public website experience through Nuxt, with CMS-backed content and safe fallbacks, so the legacy Demo is no longer needed as a frontend.
constraints: stack=Nuxt 3 + Vue 3 + GSAP; visual baseline=`demo/`; content source=Directus through Nuxt server routes; reuse existing assets; preserve SSR, reduced-motion behavior, keyboard access, and mobile natural scrolling.
success: Every public visual section and primary interaction present in `demo/` exists in Nuxt; desktop 1440x900 and mobile 390x844 have no incoherent overlap or horizontal page overflow; key navigation, dialogs, scroll interactions, and fallback states work; automated tests and production build pass; `demo/` is no longer required to render any public-facing screen.
scope v1: [home, product listing and detail, manufacturing, about, service, resources, news, shared header, FAQ assistant, inquiry flow, responsive and reduced-motion states]
non-goals: [new visual direction, English site, publishing unapproved CMS drafts, production infrastructure deployment, bypassing content review]
open assumptions: [the current `demo/` files and documented QA screenshots are the authoritative pre-migration baseline; unapproved dynamic content must remain safely absent or use the existing approved static fallback]
risks: [some Demo copy and media are intentionally unapproved; visual parity must not turn draft claims into published CMS content; local browser parity cannot replace final production-content and real-device acceptance]
