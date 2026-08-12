# Technical Support PSD Layout Analysis

Source: `D:/CURSORpj/gaunwang/技术支持(1).psd`

## Document

- Canvas: `3840 x 13144 px`, 350 dpi.
- Exported: 272 leaf layers, including 162 visible text layers.
- All text uses `AidianFengYaHei`; default tracking is `100`.
- Use `x / 3840` and `y / 13144` for responsive proportional placement. The source is a long scrolling desktop composition, not four independently sized viewports.

## Typography Scale

| PSD size (pt) | Use | Examples |
| --- | --- | --- |
| 4 | compact CTA | GET IN TOUCH |
| 7 | main navigation, machine labels, office contacts | 网站主页, FR-XS(Pro), manager details |
| 8 | support action cards and footer links | 视频教学, 常见故障分析 |
| 9-11 | hero supporting copy and footer contacts | 全球服务网络, 全国几十家门店 |
| 12 | sectional labels / regional names | 需要协助 从这里开始, 长三角区 |
| 14 | office page title | 国内直属办事处 |
| 16 | hero headline / footer section headings | 售后服务 快人一步, 产品中心 |
| 18 | online-support primary heading | 瑞钧支持 |
| 40.61 | hero service proposition | 在线报单、进度追踪、专人支持，全程透明可查 |

## Page Bands

| Band | Source bounds (x, y, width, height) | Layout |
| --- | --- | --- |
| Hero banner | `0, 0, 3840, 1930` | Full-bleed hero with a shared site header and right-aligned service-copy stack. |
| Online support | `0, 1925, 3840, 1929` | Repeated site header, centered heading/search, product selector, 4 by 2 support-action grid. |
| Domestic offices | `0, 3853, 3840, 7414` | Long white office directory: region title at left and details in the right column. |
| Footer | `0, 11267, 3840, 1877` | Dark multi-column footer, addresses left and navigation columns to the right. |

## Header

- Header visual bounds: `x=-12..3840`, `y=3..135` in the hero and `y=1932..2064` in online support.
- Main navigation labels are 7pt, ordered from `网站主页 x=1716` through `服务支持 x=2704`.
- The `EN` control is `x=3002..3042`; GET IN TOUCH is `x=3105..3234`.
- The duplicated header in the online-support band uses the same x coordinates, shifted down by about 1929px.

## Hero Banner

The hero text block is aligned to the right half (`x=2270..3423`):

| Text | Bounds (x, y, width, height) | PSD font |
| --- | --- | --- |
| 售后服务 快人一步 | `2278, 590, 692, 72` | 16pt |
| 在线报单、进度追踪、专人支持，全程透明可查 | `2275, 729, 1148, 40` | 40.61pt |
| 全球服务网络 原厂备件保障 | `2270, 823, 622, 39` | 9pt |
| 全国几十家门店 涵盖全国主要省市 | `2274, 960, 904, 48` | 11pt |
| 海外 20 来家长期合作经销商 | `2270, 1046, 775, 48` | 11pt |

## Online Support

- Primary heading `瑞钧支持`: `x=1398, y=2305, 369 x 79`, 18pt.
- Supporting label `需要协助 从这里开始`: `x=1834, y=2322, 603 x 54`, 12pt.
- Search area: `x=1307..2544`, `y=2436..2549`.
- Product selector occupies `x=632..3190`, `y=2680..2968`; it contains 9 product types.
- Support actions occupy `x=625..3187`, `y=3114..3556`, in four columns and two rows. All card labels are 8pt:
  - Row 1: 我的维修申请, 保修状态验核, 服务流程与寄修, 视频教学.
  - Row 2: 技术文件下载, 常见故障分析, 保养与易损件, 知识分享.

## Domestic Office Directory

- Directory background: `y=3853..11267`.
- The main title `国内直属办事处` is at `x=570, y=4050`, 14pt.
- Each region repeats the same two-column template: region heading at about `x=552..558`, outlet/contact details at about `x=1535..1577`.
- Regional headings are 12pt; address and manager lines are 7-8pt.
- Region start positions: 外贸 `4050`, 长三角 `5030`, 珠三角 `5704`, 浙江 `6386`, 华中 `7059`, 西南 `7730`, 华北 `8405`, 山东 `9082`, 东北 `9760`, 西北 `10452`.

## Footer

- Footer starts at `y=11267` and ends near `y=13152`.
- Brand block: `x=417..1377`, y about `11702`.
- Link columns begin at product center `x=1853`, advanced manufacturing `x=2482`, and about us `x=3089`; their section titles are 16pt and individual links 8pt.
- Address/contact copy is left aligned around `x=545`, from `y=12239` onward, at 9pt.
- Bulk purchasing block is at `x=2976..3420`, y about `12320..12749`; title is 10pt, offer copy 12pt, phone 9pt.

## Raw Extraction

The complete, machine-readable layer list is in `technical-support-psd-layout.json`. It includes every leaf layer's hierarchy path, visibility, bounds, text content, font, point size, tracking, justification, and text baseline position.
