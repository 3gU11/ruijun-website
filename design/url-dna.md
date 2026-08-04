# URL DNA

source: `http://127.0.0.1:4173/` and its `/product/`, `/manufacturing/`, `/about/`, `/service/` routes
target: `website/` Nuxt 3

## Visual Tokens

- palette: ink `#0b0b0c`, paper `#f4f4f2`, muted `#707277`, line `#d5d6d4`, accent `#e51b23`, dark panel `#131416`
- type: Inter / Noto Sans SC / Microsoft YaHei / Arial; body 15px with 1.65 line-height; display headings 42-76px desktop and 34-46px mobile; letter spacing 0
- layout: 1280px maximum content width; desktop horizontal padding 6.2%; floating 62px header inset 6.2% and 16px from top; full-viewport visual chapters; square corners or 2-5px radii
- spacing: major desktop sections use roughly 88-105px vertical padding; compact card gaps 14-20px; mobile sections use 56-72px vertical padding and 20px side padding
- imagery: real machine/factory/certificate assets are primary; images use full-bleed cover for evidence scenes and contained transparent machine renders for equipment stages
- motion: desktop hero-to-reasons handoff, horizontally covered reason scenes, and scrubbed history; mobile uses natural vertical scrolling and horizontal overflow only inside the history track

## Shared Components

- header: dark translucent floating bar, full logo at left, five primary links, language control, red solution CTA; expands to viewport width after the opening visual panel
- footer: dark full-width area with logo, product/manufacturing/contact columns, support block, copyright
- section heading: small red uppercase kicker plus large high-contrast Chinese title
- CTA: compact red rectangle with white label and arrow; no pill styling
- FAQ entry: small fixed dark glass control at the lower right, hidden during the homepage opening video

## Page Structure

- home: opening video/static machine -> machine handoff and three reasons -> three full-screen reason scenes -> six-product grid -> interactive company history -> consultation band and full footer
- product: split light hero with machine imagery -> published series grid/empty state -> model search -> compact footer
- manufacturing: full-bleed factory hero -> light three-column manufacturing system -> full-width factory evidence image -> compact footer
- about: machine hero -> shared legacy background -> overview -> interactive history -> factory -> certificates -> honors -> patents -> suppliers -> footer
- service: full-bleed document/equipment hero -> dark AI service workflow -> light FAQ -> light sales/visit contact cards -> compact footer

## Responsive Rules

- breakpoint: 760px
- mobile header is 58-70px high with 110-132px logo and an icon menu button
- no page-level horizontal overflow; reason scenes become vertical; product grid becomes one column; history may scroll horizontally within its own viewport
- reduced-motion mode removes pinning, scrubbing, parallax, and reveal transforms while keeping all content visible
