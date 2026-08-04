# 官网 PSD 重设计版 QA

prototype: http://127.0.0.1:4173/
source: [新网站首页.psd](../../新网站首页.psd)（主设计源）+ [新网站建设方案](../prd/新网站建设方案.docx)（内容参考）
checked: 2026-07-29

## Visual

- PASS：首屏保留“视频开始、静态终帧结束”的两态设计，播放阶段不额外叠加标题或按钮。
- PASS：全站仅有一套首屏悬浮 Header；第二屏内部无重复 Header、导航或 title。
- PASS：Header 与页脚均已替换为企业提供的 `377 × 123` 透明 PNG 完整 Logo，不再使用 CSS 拼合图形和重复品牌文字。
- PASS：首页 Header 保持左右留白的悬浮短条；离开首页后平滑贴顶并扩展到完整视口宽度，返回首页时自动收回。
- PASS：首屏到第二屏采用南孚式共享舞台过渡：黑色主视觉从全屏连续收缩为左侧机台框，首屏背景同步淡出，机台在同一 GSAP 时间线内缩放和换位。
- PASS：共享舞台正向、反向中间帧均只有一套机台，不再出现源机台被段落淡入逻辑重新显示的问题。
- PASS：第二屏按 PSD 重建为左侧设备、右侧“选择瑞钧的三大理由”。
- PASS：三个理由叠放在同一全屏视口；向前时下一张作为上层从右侧覆盖当前画面，旧画面保持原位，向后时当前上层退回右侧，形成与南孚一致的竖向分割中间帧。
- PASS：产品页使用从 PSD 拆出的六张独立产品图，按照 3 × 2 网格展示。
- PASS：历程页采用图3的浅色横向时间轴与固定英文标题，融入图1、图2的六个年份节点和粗体红色文字风格。
- PASS：未经正式佐证的“效率提升 50%”与“销量全国第一”均标注待复核。

## Behavior

- PASS：GSAP Core、Observer、ScrollToPlugin 均从本地 vendor 加载。
- PASS：共享舞台使用 GSAP timeline 同步控制 `left / top / width / height / border-radius`、背景透明度和机台位置，持续 1.35s，缓动为 `power3.inOut`。
- PASS：桌面端纵向段落使用 0.92s `power3.inOut` 阻尼切换。
- PASS：进入三理由屏后，滚轮依次推进三层场景的 `xPercent 100 → 0` 覆盖动画；第三张结束后才进入产品页。
- PASS：反向滚动按“领军品牌 → 先进智造 → 效率提升”返回，再离开横向轨道。
- PASS：历程页包含 `1997 / 2003 / 2006 / 2014 / 2016 / 2025`，桌面滚轮分早期、中期、近期三个横向阶段推进，走完后才进入联系页。
- PASS：键盘支持上下、左右、PageUp、PageDown 与空格导航。
- PASS：移动端使用自然纵向滚动；三理由保留原生横向滑动与 scroll snap 吸附。
- PASS：桌面端右侧采用贴边的 3px 隐藏式进度轨道，38px 红色滑块随页面滚动移动，停止滚动后自动弱化；轨道仍可按屏点击导航。
- PASS：移动端关闭自定义进度轨道，保留 3px 细型原生滚动条与自然纵向滚动。
- PASS：产品详情、选型咨询弹窗和表单演示可用。

## Browser Checks

- PASS：Chrome 1440 × 900，页面宽度 1440px，无横向溢出。
- PASS：iPhone 15 模拟视口 393px，页面宽度 393px；三理由横向容器 1179px，不撑宽页面本体。
- PASS：移动端效率页说明文字与设备图实际间距约 20px，重叠值为 0。
- PASS：移动端历程轨道宽度 1840px、视口 393px，使用独立原生横向滚动且不撑宽页面本体；首尾节点均可访问。
- PASS：桌面 1440 × 900 下自定义轨道宽 3px、滑块尺寸 3 × 38px，页面从 `scrollY 0` 到 `900` 时滑块从顶部移动到约 `172.4px`；原生滚动条占位为 0。
- PASS：桌面 1440 × 900 已检查共享舞台 25% / 50% / 80% / 完成帧及反向中间帧；落位后标题先出现，三条理由再按三次输入逐项显现。
- PASS：桌面 1440 × 900 已检查理由页 `1 → 2`、`2 → 3` 及 `2 → 1` 的 50% 中间帧和完成帧，覆盖边界、顶部标签与主图视差均正常。
- PASS：移动端 393 × 852 关闭共享舞台与 Observer，页面本体宽度保持 393px。
- PASS：移动端三理由轨道宽度 1179px、单场景 393px，三个场景均清除桌面变换和 `aria-hidden`，继续使用原生横向滑动。
- PASS：桌面 Header Logo 高度 44px、页脚 56px；移动端 Logo 实测 `110.3 × 36px`，位于 58px Header 内且不与菜单重叠，菜单展开后页面宽度仍为 393px。
- PASS：浏览器控制台无 error 或 warning。

## Open Items

- OPEN：正式上线前接入 CMS、真实产品参数、售后系统 URL 和表单提交接口。
- OPEN：正式发布前由企业确认涉及年份、性能与销量的对外口径。

## Verdict

READY FOR DESIGN REVIEW；当前 Demo 已符合 PSD 首页结构及最新横向覆盖交互要求。

## About page continuous story check - 2026-07-30

prototype: http://127.0.0.1:4173/about/
source: latest About-page reference screenshot and the requested continuous-scroll behavior

- PASS: The hero, `Since 1997`, and company overview use native continuous vertical scrolling; no section snap or wheel interception occurs before the history timeline.
- PASS: A single 1500px desktop wheel input stops inside the company overview at `scrollY=1500`; the immersive Observer remains disabled.
- PASS: The second chapter fades into the overview's warm-white background, and the overview fades into the history background without a hard color seam.
- PASS: Story text reveals once on viewport entry with opacity, 42px upward movement, and 8px blur recovery; reduced-motion mode removes all three effects.
- PASS: At `scrollY=2698`, the history panel aligns to the viewport and enables immersive input; subsequent wheel input advances the timeline cursor while the document remains at the history panel.
- PASS: Desktop Edge 1440 x 900 and mobile 390 x 844 report zero console errors; mobile has zero horizontal overflow and retains native scrolling.

verdict: READY

## Factory feathered slideshow check - 2026-07-30

- PASS: Each incoming factory image covers the outgoing image through a 1.68-second GSAP straight-edge reveal with an approximately 40px feathered boundary.
- PASS: The previous red-and-white radial glow overlay and polygon wave edge have been removed; the transition preserves the original image colors.
- PASS: Each completed image remains still for 2.6 seconds before the next automatic transition begins.
- PASS: The automatic sequence completed `1 -> 2 -> 3 -> 4 -> 1`; slide and navigation states stayed synchronized.
- PASS: Arrow and navigation controls remain available and autoplay resumes after manual transitions.
- PASS: Edge 1440 x 900 and mobile 390 x 844 render the transition without horizontal overflow or console errors.

## About shared banner continuity check - 2026-07-30

- PASS: Desktop hero and legacy chapters now render from the original `3839 x 3244` `banner.jpg` inside one shared two-viewport backdrop.
- PASS: The machine-floor reflection, pale transition area, and legacy building remain pixel-continuous across the chapter boundary; the previous split-image white overlay is no longer used on desktop.
- PASS: GSAP motion targets the shared backdrop, so scroll movement cannot separate the two image halves.
- PASS: Edge 1920 x 880 shows no horizontal seam at the hero/legacy boundary, no console errors, and zero horizontal overflow.
- PASS: Mobile 390 x 844 retains the narrower purpose-built crops, natural scrolling, zero horizontal overflow, and no immersive Observer activation.

## History entry gesture isolation check - 2026-07-30

- ROOT CAUSE: The Observer was created after native scrolling reached the history panel, so remaining inertia from the entry gesture was immediately consumed by `scrubHistoryProgress()`.
- FIX: Desktop entry is captured 140px before the history top, aligned over 0.30-0.46 seconds, and held at progress 0 until 300ms of input inactivity confirms the entry gesture has ended.
- PASS: The previous 40-event burst advanced history by about 79.6%; the identical burst now leaves history at exactly 0% and `scrollY` aligned to the panel top.
- PASS: A subsequent independent 10-event gesture advances history normally to about 24.2%, confirming the panel is not locked.
- PASS: A single 2200px wheel input from 1000px above history aligns at progress 0 instead of overshooting.
- PASS: Exit upward and re-entry resets the gate correctly; the second entry also lands at progress 0.
- PASS: Mobile 390 x 844 keeps native scrolling with the immersive Observer disabled and zero horizontal overflow.

## Certificate card separation and lift check - 2026-07-30

- PASS: All seven certification images remain separate DOM items and use equal-width seven-column desktop layout with 16-28px responsive gaps.
- PASS: Each certificate has an independent paper border and resting shadow instead of reading as one composite strip.
- PASS: Hovering a certificate applies `translateY(-14px) scale(1.025)` and a deeper downward shadow; adjacent certificates do not move.
- PASS: Edge 1920 x 900 shows seven complete cards with the fourth-card hover state unobstructed and zero console errors.
- PASS: Mobile 390 x 844 keeps the certificates in an internal horizontal scroller while the page width remains exactly 390px.

## All certificate groups card consistency check - 2026-07-30

- PASS: Certification, honor, and patent sections now share the same independent paper border, resting shadow, hover lift, hover scale, and elevated shadow treatment.
- PASS: Original media proportions remain intact: certification and patent cards stay portrait while honor cards stay landscape.
- PASS: Edge 1920 x 900 renders all five honor cards and all eight patent cards completely; the hovered card rises independently and adjacent cards keep their positions.
- PASS: Hover shadows remain visible within each correctly aligned full-screen section and are not clipped by the viewport boundary.
- PASS: Mobile 390 x 844 keeps certification and patent cards in internal horizontal scrollers, keeps honor cards in a two-column grid, and reports a 390px page width with no horizontal page overflow.
- PASS: Browser console reports zero errors and zero warnings.

## History title sequential color-fill check - 2026-07-30

- PASS: The four-line English history title now fills from gray to dark one line at a time, with each line sweeping from left to right.
- PASS: Fill duration is weighted by each line's rendered width; the next line begins immediately after the previous line reaches 100%.
- PASS: The sequence is driven by the existing wheel-controlled history progress and stays aligned with the moving red arrow.
- PASS: Real desktop wheel input initially advances only the first line; sampled progress later completes lines one and two before partially filling line three while line four remains gray.
- PASS: Mobile 390 x 844 keeps the static readable dark title, hides the desktop cursor, preserves a 390px page width, and reports zero console errors or warnings.

## Shared history title spacing and home sync check - 2026-07-30

- PASS: Desktop history-title line-height increased from 1.03 to 1.12, producing an 80.64px line box at the 72px desktop title size and removing the cramped line spacing.
- PASS: The homepage history timeline now uses the same rendered-width-weighted sequential fill calculation as the About page.
- PASS: At 24% sampled timeline progress, both pages report line fills of `100% / 100% / 56.8% / 0%` with the red cursor crossing the active third line.
- PASS: Mobile 390 x 844 keeps the existing 19px type with 25.65px line-height, static dark text, hidden cursor, and no horizontal page overflow on either page.
- PASS: Homepage and About page report zero browser console errors or warnings.

## History row overlap and real-wheel home parity fix - 2026-07-30

- ROOT CAUSE: Line separation depended only on font line-height, so rendering differences could leave no explicit space between rows. The homepage also used an unclamped wheel delta over a 1800px timeline, while the About page clamps each input to 100px over a 4000px timeline.
- FIX: The four English title rows now use CSS Grid with a responsive 10-14px `row-gap`; desktop line-height is 1.08 and mobile explicitly returns to zero row gap with its existing 1.35 line-height.
- FIX: Homepage wheel scrubbing now uses the same 4000px/4.4-viewport timeline distance and -100px to 100px per-event clamp as the About page.
- PASS: At 1440 x 900, all three measured gaps are approximately 10.8px on both pages, so adjacent title rows have non-overlapping boxes.
- PASS: On the real LAN homepage, one 720px wheel event advances only 2.5%; at 12.5% progress only line one is filling (85.9%) and lines two through four remain gray.
- PASS: The LAN server returns `styles.css?v=20260730-28` and `app.js?v=20260730-28`, confirming clients request the corrected assets.
- PASS: Homepage and About page remain 390px wide on mobile and report zero browser console errors or warnings.
