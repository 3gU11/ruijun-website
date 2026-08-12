# Repair Portal Journey QA

prototype: `http://localhost:2888/support`
source: `design/context.md` Repair Portal Continuity and page progression rules

visual:
- PASS: shared dark official-site-style header and footer frame every client route.
- PASS: service home uses a broad brand/service entry; repair request shifts to a warm-white guided workspace; history and scan retain the same typography, numbering, and red action language.
- PASS: request route was captured in Edge at desktop width; heading, task band, and five-step rail have no visible overlap.
- PASS: mobile service-home check retains readable hierarchy and a compact menu without text collision.

behavior:
- PASS: `/support`, `/repair/new`, `/requests`, and `/warranty` return HTTP 200 through the local SPA preview.
- PASS: the redesigned shell continues to call existing route actions; no API contract was changed.
- MANUAL: authenticate and submit a real repair request before release to validate signed-in and success states against production-like data.

accessibility:
- PASS: primary actions retain visible text labels; mobile navigation exposes `aria-expanded` and an accessible label.
- MANUAL: keyboard traversal of dialogs, file uploads, and all Element Plus form controls needs a final assistive-technology pass.

verdict: READY FOR VISUAL REVIEW. Residual risk is workflow-state acceptance, not the route shell or visual hierarchy.
