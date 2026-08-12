# Repair Portal Continuity Audit

target: `repairsys/src/ClientApp.vue` and `repairsys/src/styles.css`
goal: Make the independent Repair portal feel like a continuous Ruijun official-site service journey without coupling it to Nuxt.

| # | area | issue | severity | fix | status |
|---|---|---|---|---|---|
| 1 | hierarchy | The anonymous Repair home was a centered support card and product grid, so it read as a separate tool rather than the next page of the official site. | HIGH | Replaced the visible home structure with a full-width service hero, one primary repair CTA, and an official-site-style content rhythm. | fixed |
| 2 | navigation | The prior top bar only exposed service navigation after login and used a utility-toolbar layout. | HIGH | Added a public portal header with service home, new repair, progress, technical support, return-to-site, and login actions. | fixed |
| 3 | brand continuity | Repair had no equivalent footer or official-site return path in its page structure. | HIGH | Added a persistent dark brand/footer block with service actions, official-site links, and hotline. | fixed |
| 4 | conversion | Model selection was shown before explaining the repair journey, so the main action was not obvious at first view. | MED | Moved the repair CTA into the hero and positioned device selection as the next explicit step. | fixed |
| 5 | mobile navigation | The first mobile implementation displayed a close symbol while the menu was closed. | MED | Replaced it with a standard three-line menu indicator. | fixed |
| 6 | performance | Client production JS remains about 517 kB after minification. | MED | Follow up with route-level lazy loading and Element Plus import reduction; not required for this structural redesign. | open |

verification: `npm run build:client` passed. Production-preview screenshots were checked at desktop and mobile widths. Full screen-reader testing and logged-in workflow testing remain manual acceptance work.
