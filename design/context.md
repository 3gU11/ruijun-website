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

## CMS Content Editing

goal: Let non-technical content operators update common website pages without needing to understand Directus collections, JSON structures, or publishing internals.
user: Desktop content operators with low technical confidence who need to update website copy repeatedly and safely.
JTBD: Choose a page, edit visitor-facing text, see the result immediately, save a draft, then submit it through the existing review flow.
constraints: stack=Directus 11 custom Vue extension; preserve the existing draft, review, version, and publication controls; live preview must never write data or publish it.
success: The common page-copy workflow is understandable from one screen; title, SEO description, and visible sections update in a persistent preview while typing; website preview remains available after saving a draft; usable at desktop and narrow layouts.
scope v1: [simplified home navigation, page-copy form hints, persistent live page preview, retained official-site saved-draft preview]
non-goals: [replacing Directus admin, auto-publishing changes, redesigning technical product configuration or existing approval rules]
open assumptions: [page copy is the highest-frequency editing task; operators use desktop browsers; the configured website preview endpoint is available in the target environment]
risks: [a local structural preview cannot guarantee final Nuxt layout or media rendering; operators must use the saved-draft official-site preview before submission]

## Repair Portal Continuity

goal: Let a customer enter the independently deployed Repair portal from the official site without a visible product or brand-context break, while keeping Repair as a separate application.
user: Machine-tool owners who arrive from the public service page to submit a repair request, look up service progress, or scan a board QR code; they may be on a phone in a workshop.
JTBD: Recognize immediately that the Repair portal belongs to Ruijun, understand the available service actions, and complete the selected service task without encountering an admin-style dashboard.
constraints: stack=Repair Vue 3 + Vite + Element Plus; deployment and session remain independent from Nuxt; public website visual source of truth=website SiteHeader, service page, and SiteFooter; do not share Nuxt cookies, JWTs, routes, or CMS business configuration.
success: At desktop 1440x900 and mobile 390x844, the Repair landing page has an official-site-equivalent brand header, hero hierarchy, content width, typography, button language, and footer; the primary entry to create a repair request is obvious without scrolling; existing request, warranty, QR scan, and login-gated flows still work.
scope v1: [Repair client shell, desktop/mobile navigation, landing hero, service-entry composition, shared footer, request/scan page visual framing, route and CTA continuity]
non-goals: [embedding Repair into Nuxt, sharing authentication state, changing Repair API contracts, making CMS own Repair workflow rules, redesigning Repair Admin]
open assumptions: [the official website header/service/footer are the approved visual reference; the Repair client can link back to the official website through a configured public URL]
risks: [a pixel-for-pixel header copy creates a maintenance fork; therefore the Repair implementation will reproduce the published visual contract with local tokens and a small portal navigation, rather than importing Nuxt components across applications]

page progression: [service home=dark brand and task entry, repair request=light guided workshop with persistent numbered progress, device scan and warranty=focused identity confirmation, service history=case timeline and next action, signed-in home=service portfolio rather than an admin dashboard]
cross-page rules: [one shared header and footer; black, warm-white, graphite, and Ruijun red only; square-to-4px corners; page index/kicker precedes each title; transition from broad brand message to increasingly specific device and case information; no floating-card page sections]

## Repair CTA Refinement

goal: Make the anonymous Repair landing-page primary action unmistakable within the first viewport.
user: A first-time machine owner arriving from the official website, often needing to start a repair rather than browse support information.
success: The primary action is visually dominant, names the next step, remains keyboard accessible, and the CTA transition respects `prefers-reduced-motion`.
scope: [hero CTA hierarchy, one-time entry cue, next-step expectation]
non-goals: [changing the repair workflow, adding persistent attention animations, modifying login or API behavior]
