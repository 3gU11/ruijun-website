# 媒体绑定修补验收进度（2026-09-23）

## 视频验收失败路径清理修补

`verify-homepage-background-browser.mjs` 将数据恢复、恢复后播放检查、临时媒体清理与关闭浏览器分层处理。数据恢复回读成功后，即使播放检查抛错也执行删除及空查询；若数据恢复失败则保留可能仍被引用的素材。补齐原视频 ID 非空时恢复播放函数的作用域。

通过 `hero-video --different-image --fail-restoration-check` 注入恢复后检查失败：进程按预期失败，但临时资产 536 删除并认证查询为空（`cleanupVerified=true`）。日志 `output/video-cleanup-failure-injection.log`。正常 `hero-video --different-image` 再次通过保存、回读、重载、恢复播放和清理，见 `output/home-hero-video-different-current.log`。本项为验收脚本可靠性修补，不扩大产品功能覆盖范围。

## 荣誉与专利当前浏览器复验

- `verify-about-qualification-browser.mjs 12 121` 与 `20 132` 已通过画布选中、候选替换、PATCH 保存、认证回读、工作台重新打开及原 assets 恢复回读。日志分别为 `output/about-honor-browser-current.log` 与 `output/about-patent-browser-current.log`。
- 荣誉图片使用 Playwright 稳定性等待点击连续超时；脚本改用可见图片 boundingBox 的真实鼠标中心点击，后续精确断言 `qualifications/12.assets.0` 仍保留。没有派发伪造编辑消息或强制点击。
- 本脚本验证媒体地址和持久化，尚未断言不同图片解码像素；没有创建临时文件或媒体记录。不能将本证据扩大为全部资质图库逐项完成。

本报告是阶段证据，不代表 PRD 验收完成。

## 当前验证

| 要求 | 证据 | 状态 |
|---|---|---|
| 理由媒体角色隔离 | CMS 全量测试 527/527；覆盖两集合、三理由、背景/前景/图标 | 单元通过 |
| 编辑器构建 | directus-extension build 成功 | 通过 |
| 真实工作台加载 | 独立 Playwright 会话 media-prd 登录后台，打开三大特点实时预览 | 通过 |
| 未绑定理由图片状态 | 浏览器发现 pages/1 的两个背景和设备前景无 fieldPath；index.vue 已加入 media-pending 与只读原因 | 待浏览器复验 |
| 先进智造背景保存回读 | verify-homepage-reason-media-preview.mjs 运行成功，媒体 90，认证回读、授权预览及恢复通过 | API 闭环通过 |
| 增效降损设备前景 | verify-homepage-reason-machine-media-preview.mjs 运行成功，媒体 89，认证回读、授权预览及恢复通过 | API 闭环通过 |
| 关于时间轴背景 | verify-about-timeline-media-preview.mjs 运行成功，媒体 87，认证回读、授权预览及恢复通过 | API 闭环通过 |
| 关于首屏背景 | verify-about-hero-media-preview.mjs 运行成功，媒体 189，认证回读、授权预览及恢复通过 | API 闭环通过 |
| 绑定解析 | website/test/visual-binding-paths.test.mjs 12/12 | 单元通过 |

## 证据边界与后续必做

- 上述四个脚本直接调用 API，未通过浏览器选择器修改，不能当作完整 UI 验收。
- 脚本输出的 media.0 是固定报告文本；实际追加位置由数组决定，不能用该文本断言实际字段索引。
- 尚需在画布执行点击、选择候选、即时更新、保存、认证回读、刷新、恢复全流程。
- homepage_sections 独立记录的草稿脏状态、跨集合切换、预览授权与保存仍需真实验证。
- P0 其余位置与 P1 产品/制造/新闻/服务仍需逐项复核；静态资源台账及运营说明尚未完成。
- 测试操作均恢复原字段，未执行发布或提交远程仓库。

## 后续复核
- 官网全量 455 项：446 通过、9 失败；其中首页理由测试文件重复导入 assert 导致语法错误，已删除重复导入，定向测试恢复通过。其余失败尚待处理。
- 复核发现此前 Python 管道没有实际写入源码；只读标记现已通过文件差异确认落盘，仍需浏览器复验。
- homepage_sections 尚未进入 currentDraftState，保存按钮脏状态存在缺口，仍须修补。

## 独立首页区块草稿修补
- 新增 homepageSectionDraft，按真实集合切换并保留当前未保存草稿，纳入预览目标、脏状态、取消与撤销状态恢复。
- 保存后重新读取 homepage_sections 对应记录并更新保存基线。
- 新增执行测试验证修改隔离和取消恢复；CMS 全量 528/528 通过，扩展构建通过。
- 本项仍待真实浏览器验证，不能据此标记 PRD 完成。

## 官网契约复核
- 已核实 productBinding 实际输出 data-cms-preview-* 属性，更新产品封面、特性图、技术标签、工程图与资源记录身份的过时断言，保留具体字段、集合与用途检查。
- 新闻按钮类型断言更新为当前受控 mediaRole 判断，保留 CTA 独立字段测试。
- 官网全量现为 456 项：452 通过、4 失败。剩余包括缺失的浏览器验证脚本、时间轴 evidence 绑定及关于图库属性断言，尚未判定完成。

## 剩余四项修补
- 按现行内容清单恢复首页/关于页有值的 milestones.evidence 展示和精确绑定；未改写数据库。
- 资质图库断言改为保留 sourceIndex 的实际绑定，允许同一标签内的其它属性。
- 新增 cms/scripts/verify-about-timeline-workbench.mjs，替代对已丢失 output 临时脚本的依赖。真实无头浏览器登录、打开关于发展历程标题、进入 iframe 并读取 kicker/label 通过；此项为只读 smoke，不代表编辑保存通过。
- 本次全量 455/456，通过结果并非全绿；内部佐证公开隐藏规则触发失败，正修正为仅可视化编辑模式显示。媒体点击替换与保存恢复闭环及范围台账仍未全部完成。

## 首页背景浏览器验收（未通过）
- 官网最新全量 456/456 通过。
- 新增 verify-homepage-background-browser.mjs：临时草稿媒体、原 sections 备份、浏览器选择、保存回读和 finally 恢复流程。
- 两次实际运行背景已有 media.1 绑定，但点击后选中元素属性面板未出现，30 秒超时；编辑模式握手与横移点击命中待定位。
- 两次均输出 restored=true、temporaryMediaRemoved=true，页面原值认证回读相等；未发布。
- 此脚本目前是失败复现，不能作为功能通过证据。

## 首页先进智造背景真实浏览器闭环通过
- verify-homepage-background-browser.mjs 成功：真实点击上层标题（媒体工具）、属性面板 pages/1.sections[advanced-manufacturing].media.1、选择媒体 90、iframe 图片地址更新、等待 PATCH 成功、认证回读、重新打开工作台和 iframe 验证持久化。
- finally 已认证回读恢复原 sections，并删除临时草稿媒体。测试使用相同底层文件的独立媒体记录，证明引用切换和持久化；不同图片像素呈现仍需另测。
- 修复媒体模式下上层文字抢占图片选择：非媒体点击目标回退到坐标内媒体，并排除 aria-hidden 场景。
- 早期失败同时包含测试定位/异步等待问题；已改为先在表单定位目标理由、等待 editable、等待预览地址和真实 PATCH 响应，不再以按钮禁用当作保存成功。
- 截图 output/playwright/media-binding/home-background-reloaded.png。此通过只覆盖该背景位置，不代表其余 P0/P1 已完成。

## 关于首屏及时间轴浏览器闭环
- 同一脚本新增 timeline/about 场景，二者均真实选中、替换、预览更新、PATCH 成功、认证回读、工作台重载确认，最后恢复原 sections 并删除临时媒体。
- timeline: pages/2.sections[history].media.0，媒体 87；about: pages/2.sections[hero].media.0，共享背景媒体 189。
- 使用同一底层文件的不同媒体记录，验证引用闭环，不证明不同像素的视觉对比。
- aria-hidden 排除限定为 data-reason-slide 隐藏场景；可编辑的装饰背景即使 aria-hidden 仍允许媒体工具选择。
- 最新官网全量 456/456 通过。其他媒体位置、homepage_sections 实际保存及媒体台账仍待验收。

## homepage_sections 渲染链路修补
- 实查发现首页只接受 slug=home 的 pages 草稿，独立首页区块预览此前未进入派生页面。
- 新增 overlayHomepageSectionDrafts，将授权预览记录按 section_key 覆盖，保留真实 collection/id；不变更其它区块，不变更原页面对象，无公开页面时也可预览独立区块。
- 新增两个执行测试通过；83 项预览契约通过。真实独立区块保存仍待验收。

## 独立首页区块入口
- 工作台新增独立区块按钮，独立记录预览使用自身 section_key，预览条目下拉包含 homepage_sections。
- 新增只读 verify-homepage-section-workbench.mjs，真实浏览器点击先进智造独立区块，iframe 出现 homepage_sections 身份节点，通过；未修改业务数据。
- 首条 why-ruijun 独立区块预览身份节点检查超时，说明总标题模板仍缺专属身份绑定，尚待修补。
- CMS 全量 528/528 通过；独立区块媒体替换保存闭环未完成。

## 独立首页区块保存闭环通过
- 修复无父页面 ID 时 resolvePageSection 漏传 cms_section_key，总标题独立预览浏览器检查通过。
- 补齐工作台 livePreviewFields 与 Nuxt previewFields 的 homepage_sections 双端白名单。
- verify-homepage-background-browser.mjs independent 实测命中 homepage_sections/3.media.0，替换到媒体 90、即时预览、PATCH、认证回读、完整重载全部通过。
- 认证断言 pages/1 完整记录未变；测试后恢复独立记录原 media，删除临时媒体。
- 此项仍只验证相同文件的不同引用，其它 P0 媒体位置与 P1 台账仍待完成。

## 首页理由媒体扩展验收
- 新增并实际运行 leadership、machine、icon-performance、icon-advanced-manufacturing、icon-industry-leadership 五个浏览器场景。
- 五项均成功：真实画布选中、候选替换、预览更新、PATCH、认证回读、重载；每次恢复原 sections 并删除临时媒体。
- 本轮覆盖行业领军背景、增效降损设备前景、三个横移图标。对应字段分别为 media.1（背景/设备）及 media.0（图标），没有假定索引写入。
- 仍为同底层文件的不同引用，尚未用不同图片像素验证；其它页面各媒体位置仍待验收。

## 服务首屏与额外位置核查
- service 场景真实浏览器全闭环通过：pages/3.sections[hero].media.0、媒体 86，恢复及临时清理成功。
- about-machine 场景失败：桌面 CSS 明确 .about-story .hero-machine { display:none }，虽然存在 foreground 字段，当前桌面画布无可点击显示位置。不得标成已接入；需保持布局前提下设计可访问编辑入口。
- timeline-icon 场景已命中 media.0 绑定，但点击未打开属性面板，历史滚动/覆盖层交互待修补。两项失败均恢复原 media/sections 并删除临时媒体。
- 不把隐藏节点或 API 更新成功等同于可视化编辑完成。

## 关于时间轴图标已修复并闭环
- 原因：图标继承 pointer-events:none 且层级低于时间轴覆盖层；scoped 样式中的 html 祖先选择器未正确生效。
- 增加仅编辑模式生效、限定 about-page 的非 scoped 样式：图标允许指针、父层 z-index 8。公开页面规则不触发。
- 浏览器计算样式确认 pointer=auto、parentZ=8，elementFromPoint 命中图标。timeline-icon 场景替换、保存、认证回读、重载、恢复、临时清理全部通过。
- 官网全量 459/459 通过。关于桌面机器前景隐藏问题及其它媒体位置仍待完成。

## 不同图片内容验证
- 验收脚本新增 --different-image，临时媒体引用另一张已有受管图片（媒体 91 的底层文件），仍按目标用途和区块授权。
- home 场景通过不同图片像素闭环；independent 场景图片解码失败，尚未通过，需核查媒体授权。
- 各次均恢复原字段并删除临时媒体；independent 像素测试在保存前失败。
- 本证据补足首页先进智造背景不同图片内容的实际生效验证，不外推到其余位置。

## 独立区块不同图片授权缺口
- 不同像素验收证明 pages 路径真实生效；independent 路径此前仅 URL/引用验证不足，替换后图片不能 decode。
- 前端 livePreviewGrantIds 遗漏 homepage_sections，已增加受控 media IDs；重建并重启后后端拒绝素材预览授权，独立区块尚未通过，不得宣称完整可用。
- 本轮各失败尝试均恢复原媒体并删除临时媒体。下一步补后端用途授权校验及回归测试。
## 2026-09-23 本轮修补与验证

- 修复 `homepage_sections` 预览素材授权：按 `page_key=home`、三大理由 `section_key`、受控 `home.reason.*` 用途、图片类型及草稿/已发布状态校验；新增跨集合、错误区块、禁用素材和私有状态拒绝测试。
- 补齐独立区块预览授权 ID 收集；独立先进智造背景使用不同底层图片完成真实浏览器闭环：点击、即时换图、保存、认证 Directus 回读、工作台重载、像素差异确认、父页面隔离、恢复和临时媒体删除回读均通过。
- 关于首屏机器前景增加仅编辑模式的“当前桌面布局隐藏”素材入口；不同图片闭环通过。合作品牌、国内客户、国外客户、服务入口图标、服务区域图和地图、关于厂区图库均已完成不同图片浏览器闭环并恢复数据。
- 首页首屏增加仅编辑模式的海报/结束静帧素材入口；结束静帧不同图片闭环通过。视频临时验证因视频素材治理要求和浏览器进程异常未判通过，不能据此宣称视频闭环完成。
- 首页/关于共用时间轴背景授权和首页时间轴图标点击层级已补修；首页时间轴背景与图标测试均通过（当前图标测试使用同底层文件，未计作不同像素证据）。
- 定向 CMS 测试 23/23 通过，`git diff --check` 无实际空白错误。Nuxt 生产构建曾受已有 4175 开发服务锁阻断，不能标记构建通过；未停止用户已有服务。

### 当前仍未完成

- 首页首屏视频的真实不同内容替换、保存、回读和重载闭环仍待重新执行；需要保留 `poster_asset_id`、`autoplay` 等治理字段并避免浏览器进程异常。
- PRD 要求的所有产品、制造、新闻、服务和关于媒体位置尚未全部逐项完成不同图片闭环；当前证据只覆盖本文件列出的场景。
- 绑定台账和运营文档仍需根据最终逐项结果更新，不能把源码属性或 HTTP 成功替代认证回读证据。

## 2026-09-23 后续复核

- 首页首屏视频重新使用真实视频候选（媒体治理字段包含 `poster_asset_id`、`autoplay`、`muted`、`loop`）完成浏览器闭环；验证媒体工具选中、预览源切换、草稿保存、认证回读、工作台重载、恢复和临时媒体删除回读。视频元素不做图片像素断言，改为验证受保护预览媒体源和 HTMLVideoElement 绑定。
- 修正首页首屏媒体槽位契约：海报与结束静帧通过受控 `home.hero.poster` 槽位进入编辑模式；首页时间轴背景按 `role=background` 选择，避免误把图标当背景。
- 认证 CMS 全量测试当前 531/531 通过；官网全量测试当前通过。源码契约断言已同步到新的共享媒体槽位实现。
- 重新检查后，PRD 完成定义仍未整体满足：产品、制造、新闻、服务及关于页全部媒体位置尚未逐项完成独立的不同内容闭环，绑定台账和运营说明也尚未完成最终逐项更新，因此不标记整个 PRD 完成。
- 使用独立 `NUXT_BUILD_DIR` 并允许已有开发服务锁共存后，Nuxt 生产构建已成功完成；未停止 4175 现有开发服务。

## 2026-09-23 PRD 范围复核补充

- 现有真实验收脚本补跑通过：资质证书、厂区图库、国内/国外客户图库、合作品牌、时间轴背景/图标、制造工艺图层、服务区域图与地图、首页首屏视频、首页理由背景/机器前景、关于首屏背景/机器前景、服务首屏与入口图标、服务教程海报、产品型号工程图、产品资料下载、动态新闻封面、视频新闻切换。
- 每项脚本均验证受保护预览渲染或媒体响应，并在结束阶段恢复原记录；涉及临时媒体的脚本确认了清理结果。新闻和视频脚本也确认公开接口不泄露草稿媒体。
- 这些脚本覆盖了当前仓库已有的主要媒体绑定，但仍不能替代 PRD 要求的逐项“不同内容像素/视频内容”证据；产品、制造、新闻和服务的全部媒体槽位仍需按台账继续补齐。

## 2026-09-23 荣誉与专利补验

- 荣誉证书：`qualifications/12.assets.0`，真实浏览器不同受管素材替换、保存、认证回读、重新打开和恢复通过。
- 专利证书：`qualifications/20.assets.0`，真实浏览器不同受管素材替换、保存、认证回读、重新打开和恢复通过。
- 新增验证脚本：`cms/scripts/verify-about-qualification-browser.mjs`，默认可传入资质记录 ID 和候选媒体 ID，使用真实工作台与官网 iframe，不以 API PATCH 单独替代画布验收。
- 产品型号自动详情与第三型号文字预览脚本通过；产品发布恢复脚本因本地没有已发布型号而失败，不能作为已完成发布证据。

## 2026-09-23 产品系列封面候选隔离

- 修复产品系列封面错误使用 `product.gallery.image` 的问题。该用途现在独立为 `product.series.cover`，尺寸工程图不会再作为系列封面候选。
- `cms/scripts/verify-product-series-cover-browser.mjs` 已验证临时双素材的真实画布替换、保存、认证回读、刷新保持、恢复与临时资产删除。

## 2026-09-23 制造与新闻媒体边界

- `manufacturing_evidence.media` 中仍存在静态 PSD 路径，当前标记为只读/待媒体；只有带真实 `media_asset_id`、用途和页面区块的记录才可进入媒体替换。
- `articles.body_media` 已补齐正文详情画布节点和独立 `news.article.body` placement；当前真实数据仍为空，因此尚未完成不同正文图片的浏览器替换、认证回读和恢复验收，不能把建模完成等同于媒体闭环完成。
- 新闻封面、视频列表和教程海报已有独立真实验证证据。

## 2026-09-23 静态媒体分类审计

- `cms/scripts/audit-website-media.mjs` 已扩展为逐行输出媒体引用分类，并排除 Nuxt 构建产物和 dist，避免把生成文件误算为源码遗漏。
- 当前源码扫描 227 个文件、222 条媒体引用；所有引用均被归入 `bound-or-explicit-readonly` 或 `static-fallback-or-decoration`，未发现未分类的 `needs-review` 引用。
- 该结果只证明源码引用已经有绑定属性或明确属于回退/装饰；它不把静态资源升级为 CMS 媒体，也不替代真实浏览器闭环。
- 关键静态项包括固定动画机器、纸张纹理、Logo、PSD 回退图和没有 CMS 字段的默认图，继续按只读/不可编辑装饰处理。

## 2026-09-23 最终回归复核

- CMS 全量回归：通过（修正产品系列封面用途契约后的源码断言后重新执行）。
- 官网全量回归：通过。
- 静态媒体分类审计：227 个源码文件、222 条媒体引用，未分类 `needs-review` 为 0。
- 产品系列封面独立用途 `product.series.cover` 的真实浏览器闭环通过；尺寸工程图仍使用 `product.gallery.image`，候选不再串用。
- 当前完成定义仍保留范围边界：未建模正文媒体、静态 PSD/Logo/纹理和没有受控字段的默认图保持只读/待建模；部分媒体槽位有脚本或 API 证据但尚未逐项完成不同内容浏览器闭环，不标记为全部完成。

## 2026-09-23 最终绑定不变量审计

- 新增源码节点扫描：所有带本地图片/视频的 `<img>/<video>` 节点现在均有受控绑定属性，或明确 `data-cms-preview-readonly` 分类；未分类节点数量为 0。
- 固定动画机器、首页装饰机器图和页脚 Logo 均补充明确只读原因；不进入媒体替换流程。
- 官网回归测试在补充只读属性后仍通过。

## 2026-09-23 制造静态媒体只读补丁复核

- 制造页工艺节点及移动端流程中没有 `mediaFieldPath` 或受治理媒体的图片/视频现在显式带有 `data-cms-preview-readonly="media-pending"` 及中文原因；工作台不会把这些静态或未建模资源误显示为可替换媒体。
- 官网全量回归：460/460 通过，日志：`output/website-after-manufacturing-readonly.log`；新增制造页工艺节点和移动端待媒体属性契约测试。
- CMS 全量回归：531/531 通过，日志：`output/cms-after-manufacturing-readonly.log`。
- `find-unbound-media.mjs` 输出为空；媒体源码审计仍为 227 个源码文件、222 条引用、`needs-review=0`；`git diff --check` 仅有换行符转换提示，无实际空白错误。

## 2026-09-23 新闻正文媒体治理补充

- 新增受控用途 `news.article.body`，并同步到媒体治理规格、Directus 展示位选项、工作台候选过滤、正文画布属性和预览授权边界；正文素材不会落入动态封面或视频分享候选。
- CMS 与官网回归分别为 532/532、461/461 通过。
- 本地临时新闻正文浏览器验收未形成有效闭环证据：工作台 iframe 保持 `about:blank`，未能加载详情画布；临时文章和临时媒体已清理，不能把此次尝试计为真实浏览器通过。

## 2026-09-23 正文媒体真实闭环复验通过

- 已修复正文媒体在 CMS/Nuxt 白名单中丢失、解析误放产品分支、排序后索引串写，以及画布修改未同步保存 JSON 的问题。工作台与预览端点已重建，并重启本地 Directus。
- 可重复脚本：`cms/scripts/verify-news-body-media-browser.mjs`。临时文章 1054、两张不同底层图片 511/512 完成真实登录工作台选中、替换、图像解码和像素差异、保存、认证回读、工作台重开及预览地址保持；恢复原值采用认证 API 回写并回读。
- 删除临时文章和媒体后逐条认证查询为空，`cleanupVerified=true`。日志：`output/news-body-browser-verified.log`。
- 官网全量 463/463 通过；CMS 全量 533/533 通过。测试日志分别为 `output/website-body-final-regression.log`、`output/cms-body-final-regression.log`。
- 此证据更新此前正文媒体“待建模/无法加载”的历史结论，但不证明其他尚未逐项验收的媒体槽位完成；本次重载断言是图片地址保持，尚未对重载及恢复后的图片执行像素比对。

### 正文媒体刷新与画布恢复像素复验

`cms/scripts/verify-news-body-media-browser.mjs` 再次通过：刷新后的图片像素与替换后像素一致；从同一画布选择原图、点击保存、认证回读完整 `body_media` 与原始值相等；重新打开工作台后原图像素仍一致。结果包含 `reloadPixelsVerified=true`、`canvasRestorationVerified=true`、`cleanupVerified=true`，日志为 `output/news-body-browser-verified.log`。此结果补齐前述恢复采用 API 和重载只检查地址的验收限制。其他页面未验收项不因此升级为完成。

### 2026-09-23 P0 行业领军背景与图标复验

修正 `verify-homepage-background-browser.mjs` 中替代图片固定使用 91 号、导致 leadership 场景拿同一个文件对比的问题。分别执行 `leadership --different-image` 与 `icon-industry-leadership --different-image`，真实画布选择、不同像素替换、保存、认证回读、重载像素一致均通过；API 恢复与临时素材删除回读通过。证据：`output/reasons-leadership-current.log`、`output/reasons-leadership-icon-current.log`。仅覆盖这两个位置。

### 2026-09-23 P0 其余理由图标逐项复验

`icon-performance --different-image` 和 `icon-advanced-manufacturing --different-image` 两个真实浏览器场景通过：各自画布选中、不同像素替换、保存、认证回读、完整重载像素保持均成功；原始页面数据通过 API 恢复并回读，临时媒体删除并确认不存在。证据分别为 `output/reasons-performance-icon-current.log`、`output/reasons-manufacturing-icon-current.log`。结合此前行业领军图标的单独运行，三个理由的图标均已有逐项证据；不据此扩大到未测试位置。

### 2026-09-23 首屏海报与结束静帧逐项复验

分别执行 `verify-homepage-background-browser.mjs hero-poster --different-image` 和 `hero-still --different-image`。两个场景均完成真实画布选中、不同图片解码像素变化、保存、认证回读以及重载后的像素一致；原始页面数据恢复并回读，临时媒体删除并回读确认。日志：`output/home-hero-poster-current.log`、`output/home-hero-still-current.log`。此处验证编辑模式中的两个明确媒体入口，不将其扩大为视频播放时序验收。

### 制造页真实画布增量验收

CNC 主图场景 `manufacturing-cnc --different-image` 通过真实选中、不同像素替换、保存回读、重载像素与恢复清理（`output/manufacturing-cnc-browser-current.log`）。核心设备场景暴露底图按 role、按钮按数组位置绑定的差异，已使按钮优先按 equipment role 定位并传递媒体槽位。但保存后按 role 回读断言仍失败，不能计为通过；原始页面与临时素材已按 finally 恢复清理。失败日志：`output/manufacturing-equipment-browser-current.log`。下一步需追踪保存规范化是否移除了设备媒体 role。

### 2026-09-23 核心设备媒体角色修补与真实闭环

- 根因：页面媒体规范化仅按 `media_asset_id` 去重，导致同一文件在默认槽位和 `equipment-1` 等媒体角色复用时，一个合法位置被删除；同时核心设备底图与点击按钮的绑定索引不一致。
- 修复：按 `media_asset_id + role` 去重；核心设备可见槽位按声明 role 找回原始索引，并在按钮节点传递 `data-cms-preview-media-slot`。
- `manufacturing-equipment --different-image` 真实浏览器通过选中、不同像素、保存、认证回读、刷新和恢复，临时素材已清理。日志：`output/manufacturing-equipment-browser-current.log`。
- CMS 全量与官网全量回归均通过；日志：`output/cms-after-equipment-fix.log`、`output/website-after-equipment-fix.log`。

### 2026-09-23 制造首屏不同像素真实浏览器闭环

- 修正 `verify-homepage-background-browser.mjs` 的制造首屏验证配置：原脚本错误使用通用图层用途 `manufacturing.layer.image` 并通过空候选查询；现绑定真实草稿 `media_assets/55`、用途 `manufacturing.hero.image`，与制造页首屏治理映射一致。
- `manufacturing-hero --different-image` 真实工作台登录后，点击 `hero-building` 图层、选择不同图片并确认解码像素变化；保存后认证 Directus 回读和完整重载均保持新素材。
- finally 流程恢复原始 `pages/8.sections` 并回读相等，删除临时素材且认证查询为空。证据：`output/manufacturing-hero-browser-current.log`。
- 本轮全量回归：CMS 534/534、官网 464/464；`audit-website-media.mjs` 报告 `unrecognized_resources: 0`。本审计仍标记部分资源迁移清单和媒体元数据需要进一步核对。
- 此项只闭环制造首屏背景，不将制造工艺节点/图库全部标记完成；PRD 仍有关于、产品、制造及视频等逐项媒体闭环待验收。

### 2026-09-23 首页首屏视频不同文件与恢复播放闭环

- `hero-video --different-image` 完成真实画布选中、切换到不同底层视频文件、受保护预览 URL 解码并持续播放、保存、认证 Directus 回读和工作台重载播放验证。
- 脚本增强了恢复断言：恢复原 `hero_video_asset_id` 后重新加载画布，若原值为空则验证 `/assets/home-intro-raw.mp4` fallback 解码和播放推进；本次恢复验证通过。
- 首页 `pages/1.sections[hero].hero_video_asset_id` 已恢复原值；临时媒体记录 532、533、534 已删除，认证查询返回不可访问，未改变公开发布状态。证据：`output/home-hero-video-different-current.log`。
- 该证据验证视频编辑闭环，不代表新闻视频或所有产品/制造媒体槽位已完成；其余“部分验证”边界保留。

### 荣誉与专利不同像素闭环复验

增强 `verify-about-qualification-browser.mjs` 的解码像素断言后，荣誉 qualifications/12 使用候选 121、专利 qualifications/20 使用候选 131 均完成真实鼠标选中、像素变化、保存、认证回读、重载像素一致及原 assets 恢复回读。日志：output/about-honor-browser-current.log、output/about-patent-browser-current.log。

专利候选 132 与原图解码像素相同，因此其早期成功只证明引用切换；此次改用候选 131 才补齐不同画面证据。未创建新媒体或文件；原值恢复采用 API，未执行恢复后画布像素比较。此结果只覆盖两条记录，不外推到整个图库。

### 产品系列封面像素闭环增量

`verify-product-series-cover-browser.mjs` 新增解码像素差异和刷新一致性断言，真实运行通过。product_series/1.cover_asset 完成点选、即时换图、保存、认证回读、重开像素一致；原 cover_asset 恢复并回读，两个临时素材删除且查询为空。日志：output/product-cover-pixels-current.log。此项覆盖系列封面，不涵盖型号主图、特性图、工程图、技术标签；本次恢复采用 API 回写。

### 产品型号主图真实浏览器失败复现

新增 verify-product-model-machine-browser.mjs，基于 product_models/1.configuration.machine_asset_id 临时受管主图进行真实工作台测试。画布点击后属性面板显示“product_models/1 · 区块位置”和静态素材提示，未出现预期 configuration.machine_asset_id 媒体替换路径。日志 output/product-machine-browser-current.log，原 configuration 已恢复且临时媒体删除空查询通过。

源码确认 displayImageFieldPath 只识别 media.0；visual-editing-fields.js 的 scalarMediaFields 也没有 machine_asset_id。仅增加模板条件未令浏览器通过，已撤回该尝试，需继续核对预览配置归一化、字段白名单及运行版本。主图不得计为已接入。

### 2026-09-23 产品型号主图真实浏览器闭环通过

根因为四处叠加，全部修复后 `cms/scripts/verify-product-model-machine-browser.mjs` 通过：

1. `website/pages/product/[slug].vue`：`displayImageFieldPath` 只认 `media.0`。新增 `managedMachineAssetId` / `hasManagedMachineAsset`，绑定存在时优先返回受保护代理路径与 `configuration.machine_asset_id` 字段路径。
2. `cms/extensions/content-editor-workbench/src/visual-editing-fields.js`：`scalarMediaFields` 缺 `machine_asset_id`，且遗留记录（仅有静态 `configuration.machineImage`、无 ID 键）首次替换被判为只读。补入白名单并新增材质化分支，使首次替换落盘。
3. `website/server/services/cms-preview-media.mjs`：`decoratePreviewMedia` 未处理该槽位；同时**关键缺陷**是 `collectPreviewMediaAssetIds` 只收集 `media_asset_id`，导致已绑定素材被授权集合拒绝而恒返 404。两处均已补入 `machine_asset_id`。
4. `cms/extensions/content-editor-workbench/src/visual-preview-media.js`：`machine_asset_id` 原先列入 `DIRECT_ASSET_FIELDS`，预览时被就地改写为媒体路径，下游再拼接一次代理前缀，产生 `/api/preview/media/%2Fapi%2Fpreview%2Fmedia%2F554` 这类双重编码地址。现改为 `PRESERVED_ID_ASSET_FIELDS`：保留受治理 ID 原值（含原始数字/字符串类型），仅追加瞬态渲染路径 `machineImage`，与 `hero_video_asset_id` 同构。

- 验收结果：`differentPixelsVerified`、`reloadPixelsVerified`、`selected`、`replaced`、`saved`、`authenticatedReadback`、`reloaded`、`restored`、`cleanupVerified` 全部为 `true`；临时素材删除后认证查询为空，原始 `configuration` API 回写并回读相等。
- 回归：CMS 536/536、官网 466/466 通过；首页首屏视频、产品系列封面、型号详情/工程图/第三记录、资源下载等既有验收脚本复跑通过；`audit-website-media.mjs` 仍为 227 个源码文件、`unrecognized_resources: 0`、`needs-review` 为 0。
- 绑定台账与测试已同步：新增 `website/test/cms-preview-media.test.mjs` 两条授权与装饰断言、`cms/test/visual-preview-media.test.mjs` 一条 ID 保留断言、`cms/test/visual-editing-fields.test.mjs` 一条材质化断言。
- 边界：本项只闭环型号主图槽位；特性图、尺寸工程图、技术标签及制造工艺节点仍按各自既有结论，不因此升级为完成。

### 2026-09-23 制造页媒体绑定运行时 DOM 复核（结论更正）

此前对制造页"未接入"与"动态绑定已覆盖"两种说法均缺运行时证据。新增 `cms/scripts/audit-manufacturing-media-dom.mjs`（只读，不修改数据）登录工作台并开启媒体编辑模式后统计 `/manufacturing` 真实 DOM。

**方法更正**：首次复核在**默认模式**取样，得到"45 个节点 0 绑定"的错误结论。制造页 PSD 图层只在编辑模式开启后才接收编辑装饰，因此必须以编辑模式 + 预览会话取样。同时判据应为制造页契约 `collection + item-id + field-path + media-role`（该面不使用 `placement-key`），并需覆盖 `media-slot`。

- 复核结果：45 个媒体节点中 **30 个完整绑定**（25 个带 `media-slot`）、**14 个显式只读**（原因均为 `media-pending`）、**1 个装饰未分类**（`<a class="brand">` 内的站点 Logo）。无祖先继承绑定。
- 发现并修复的真实缺口：`mobileManufacturingSteps` 与 `mobileManufacturingFlow` 的节点此前**不携带 `binding`**，导致移动端步骤图既无编辑槽位也无 `media-pending` 只读原因，形成"悬空"状态（复核中表现为 `<article class="mobile-manufacturing-step">` 内出现无任何属性的 `/api/preview/media/50`）。现复用 `processNodes` 已解析的 `collection`/`itemId`/`mediaFieldPath`，并按区块 `cms_item_id` 补齐移动端首屏与各车间步骤的绑定；绑定量由此从 26 升至 30。
- 回归：CMS 536/536、官网 466/466；`verify-product-model-machine-browser`、`verify-product-series-cover-browser`、`verify-manufacturing-process-node-preview`、`verify-manufacturing-layer-media-preview` 全部通过。
- 说明：本复核只判定媒体绑定完整性，不代表每个制造页槽位都已完成**不同内容浏览器闭环**（像素级替换验证）。生产核心设备、CNC 主图、制造首屏三处已有此前记录的真实闭环证据；其余槽位仍按"有绑定、未逐项像素验收"边界保留。
- 遗留的非媒体节点：站点品牌 Logo 属装饰性品牌标识，不进入媒体治理范围。

### 2026-09-23 局域网用户无法预览画布（已修复）

**现象**：局域网内的同事打开实时预览后画布空白、无法编辑；宿主本机访问一切正常，容易误判为客户端网络问题。

**根因**：CMS 签发的预览地址是 `127.0.0.1`。`resolvePreviewOpenUrl` 依据 `req.hostname` 与 `WEBSITE_PREVIEW_ALLOWED_HOSTS` 决定是否替换主机名，未命中白名单时保留配置原值。运行时该配置被覆盖为 loopback，于是客户端浏览器被指向**它自己**的 4175 端口，那里没有服务 → 画布 `bodyLen=0`、无任何绑定属性。

具体触发点：本地调试用的 `output/start-directus.sh` 曾硬编码 `WEBSITE_PREVIEW_OPEN_URL=http://127.0.0.1:4175/...` 与 `WEBSITE_PREVIEW_ALLOWED_HOSTS=127.0.0.1`，覆盖了 `cms/.env.local` 中正确的局域网配置。**该硬编码已移除**，脚本改为只读取 `.env.local`。

**修复内容**：
1. `output/start-directus.sh`：删除全部 loopback 硬编码，仅加载 `cms/.env.local`，与启动脚本行为一致。
2. `启动CMS官网维修系统.ps1`：新增 `Get-LanIPv4Addresses`，枚举**所有**可用局域网 IPv4；预览白名单、预览来源白名单、CSP `child-src`/`frame-src`/`form-action` 全部按多地址生成。修复一处运算符优先级缺陷：`+` 与 `-join` 混用时逗号分隔失效，`child-src` 曾被生成为空格分隔，已加括号修正。
3. `cms/.env.local`：`WEBSITE_PREVIEW_ALLOWED_HOSTS` 补入 `localhost`。
4. `website/.env.local`：`NUXT_PUBLIC_CMS_PREVIEW_ORIGINS` 补入 `http://localhost:8055`。

**验收**：新增 `cms/scripts/verify-lan-preview-access.mjs`，以局域网主机名完整走通登录 → 工作台 → 打开预览 → 编辑模式 → 媒体工具，并断言 `preview_open_url` 不含 loopback。结果：`previewHost=172.21.8.140`、`editMode=true`、`mediaToolReady=true`、`editableNodeCount=69`、画布绑定属性完整。回归 CMS 536/536、官网 466/466。

**边界**：白名单仍以 `.env.local` 中登记的具体地址为准；换网络后需更新该文件，或用启动脚本（自动枚举全部本机地址）。

### 2026-09-24 业务测试反馈问题逐项核查与修复

针对业务反馈的问题清单逐项做了运行时复核，其中多项结论与反馈不同，记录如下。

**方法更正（重要）**：画布有三个工具（选择 / 文字 / 媒体），点击处理会按工具类型筛选目标——媒体工具下点击文字元素**不会选中**，这是设计行为。此前若用媒体工具测试文字元素，会得出"点不动"的错误结论。核查每一项时必须切换到与元素类型匹配的工具。

| 用例 | 核查结论 | 处理 |
| --- | --- | --- |
| BB-22 视频封面与视频分别编辑 | **确认缺陷**。新闻详情页 `<video>` 的 `poster` 无任何绑定，封面无法单独编辑；且所有视频位置（首页首屏、制造页、新闻页）均无封面绑定 | 已修，见下 |
| BB-23 复制列表项 | 在 `items` 列表上**功能正常**（实测 6→7 项，正好 +1，副本独立）；在 `resources`/`drawings` 上**按钮不出现** | 已修，见下 |
| BB-25 删除前取消与确认 | **功能正常**。确认对话框存在且取消后条目保留（实测 6 项不变） | 无需修改 |
| BB-27 修改产品参数和单位 | **功能正常**。参数为 `product_parameters` 独立记录，`unit` 可编辑 | 无需修改 |
| BB-28 产品尺寸图和特点图切换 | 切换入口存在（`.specification-pager` 上页/下页）；图片可替换；但**无列表操作** | 已修，见下 |
| BB-29 产品资料列表编辑 | 标题与链接可编辑（`resources.N.title` + link-path）；但**无法调整顺序** | 已修，见下 |
| BB-31 图库 / 网点后续条目 | 网点区域标题、区域图、门店地址**均可编辑**，区域有完整列表操作；图库第 3 张**可替换**但无列表操作 | 见下边界说明 |

**根因与修复**：

1. `cms/extensions/content-editor-workbench/src/visual-editing-fields.js`：`visualReorderableArrays` 原先只含 `items` 与 `features`，导致 `resources`（产品资料）、`drawings`（尺寸图）等真实列表拿不到复制/删除/上移下移。已扩充为 `items / features / resources / drawings`，并重写 `getVisualListReorder` 使其支持两种寻址形态——条目本身（`media.2`）与条目字段（`resources.0.title`），以及经过中间对象到达的数组（`configuration.drawings.0.*`）。嵌套记录（`items.0.offices.0.address`）仍**有意排除**，避免编辑门店地址时误动外层列表。

2. **图库（`media`）有意不加入白名单**。图库槽位由模板声明（`shared/about-factory-gallery.mjs` 的 `hydrateFactoryMediaSlots` 固定补出 `factory-1..4`），不是存储数据：删除会被下次渲染重新补出，复制会产生永不渲染的空槽位。图库保持"仅替换"语义，与页面实际能力一致。

3. `website/pages/news/[slug].vue`：新增编辑模式下的视频封面独立入口（复用 `about.vue` 既有的 `.cms-hidden-media-preview` 模式），绑定 `media.${index}.poster_asset_id`，媒体角色 `poster`，展示位 `news.article.poster`。

4. `website/server/services/cms-article-reader.mjs`：`sanitizeArticle` 现会解析媒体条目自身的 `poster_asset_id` 引用，且条目级封面优先于素材级默认封面，使运营可为单个视频指定封面而不影响素材记录。

5. `cms/content-workflow/media-asset-governance.mjs` 与工作台用途表：登记 `news.article.poster`（image，1280×720，16:9）。候选媒体按 `placement_key` 精确匹配，需先导入符合该用途的已发布图片，封面候选才会出现。

**验收**：新增 `cms/scripts/verify-visual-list-controls-browser.mjs`（列表复制/删除确认/保存态，含数据还原）与 `cms/scripts/verify-news-video-poster-browser.mjs`（创建临时已发布视频与临时文章，验证封面入口独立可选中，随后清理）。结果：封面入口 `coverEntryPresent=true`、`field-path=media.0.poster_asset_id`、`editable=true`；列表控件 `cancelKeptItem=true`、`addedOne=true`、`saveEnabled=true`、`sectionsUnchanged=true`；两个脚本临时数据均清理干净。

**回归**：CMS 539/539、官网 466/466；`verify-product-model-machine-browser` 通过。

**边界**：
- 图库保持"仅替换"，不提供增删与排序；"图库"在工作台的入口名为**厂区风貌 / 国内客户 / 国外客户 / 合作品牌**，"网点"的入口名为**国内直属办事处**。反馈中的"没找到"很可能源于用例措辞与入口命名不一致，而非能力缺失。
- 产品尺寸图当前仅有 1 项，删除按钮按 `length <= 1` 规则禁用；需至少 2 项才能验证排序与删除。
- 首页三大理由的列表由 `hydrateHomeReasonFields` 动态补全，与图库同理，不在可增删范围。

### 2026-09-26 BB-30 / BB-37 / BB-39 / BB-40 核查与修复

**核查方法**：这四条都需要权限边界，因此用管理员在隔离环境临时创建"内容编辑"账号（脚本自建自删，不在库中遗留），逐项实测后清理。

| 用例 | 结论 | 处理 |
| --- | --- | --- |
| BB-30 切换新闻条目不串内容 | **功能正常** | 无需修改 |
| BB-30 新闻页新增的两个内容 | **已完整接入** | 无需修改 |
| BB-37 保存失败后重试 | 失败提示与草稿保留均正常；但失败后旧的"已保存"提示可能残留 | 已修 |
| BB-39 会话失效时保存 | 不假报成功；但提示为英文原文，缺中文恢复指引 | 已修 |
| BB-40 草稿没有直接公开 | **功能正常**（服务端强制保持草稿） | 无需修改，记录一处静默降级 |

**BB-30 实测**：编辑第一条标题并保存标记 → 切换到第二条（出现"未保存修改"确认）→ 第二条标题为自身值、未串入标记 → 返回第一条，标记已消失、恢复为已保存值。新闻页新增的两条内容（`测试1`/`测试2`，category=news）在画布上均有独立绑定 `cover_asset`、`category`、`title`、`display_date`，逐条可编辑。

**BB-37/39 修复**（`cms/extensions/content-editor-workbench/src/module.vue`）：

- 新增 `apiStatus` / `setSaveError`。`setSaveError` 在写入错误信息的同时清空 `message`，确保一次失败的请求不会让上一次的成功提示继续留在页面上。
- `apiError` 对 401/403 返回中文恢复指引：「登录会话已失效或当前账号没有保存权限。未保存内容仍保留在页面中，请先复制重要内容，再重新登录后保存。」此前会直接显示英文 `Invalid user credentials.`，或退化为笼统的"保存失败"。
- 已把 `savePage`、`saveHomepageSection`、`saveModel`、`saveEditorialRecord` 四个高频保存入口切到 `setSaveError`。

**BB-40 实测**：匿名读取草稿返回 403；编辑可保存草稿（200）；编辑请求发布时**服务端强制把状态覆盖回 `unpublished`**，草稿未泄露（`leakedTitle=false`）。机制位于 `content-workflow/content-publication-workflow.mjs` 第 177-180 行——`content_editor` 在 draft→draft 分支中被显式写入 `publication_state: 'unpublished'`。

**已知静默降级（记录，未改）**：编辑请求发布时 HTTP 返回 **200**，而状态实际未变更。用户若主动点"发布"会以为成功。当前工作台只提供"保存草稿"，正常路径不触发；若后续开放发布入口，应改为返回 403 以符合 BB-37"失败不显示已保存"的要求。

**新增验收脚本**（均自建临时账号/记录并自清理）：

- `cms/scripts/verify-news-record-switch-browser.mjs` — 条目切换不串内容
- `cms/scripts/verify-save-resilience-browser.mjs` — 用路由拦截分别注入 500 与 401，验证草稿保留、按钮可再次点击、中文会话失效提示、无假成功
- `cms/scripts/verify-draft-publication-boundary.mjs` — 匿名读 403、编辑可存草稿但无法发布

结果：`draftRetained=true`、`saveEnabledAgain=true`、`specificMessage=true`、`recoveryGuidance=true`、`falseSuccessAbsent=true`、`stillNotPublished=true`、`leakedTitle=false`、`temporaryUserRemoved=true`。

**回归**：CMS 540/540、官网 466/466。

**说明**：Directus 的 access token 默认 15 分钟内有效，登出只吊销 refresh token，因此"登出后旧 token 短时间内仍可写入"是 Directus 的标准行为，不是本项目的缺陷；BB-39 验证的是 token 真正失效（401）时的页面表现。

### 2026-09-26 首页横向滚动背景无法修改（根因 + 修复）

**现象**：首页「三大理由」横移区，在画布上点击背景图，属性面板提示"此为静态素材；请先在媒体资产中导入、审核并发布后再替换"，**没有任何替换控件**。

**根因（两处叠加）**：

1. **区块没有绑定可识别角色的素材**。`shared/visual-binding-paths.mjs` 第 69 行，理由的图片绑定为
   `image: mediaFieldForRoles(media, ['background','image','photo','primary','foreground'])`。
   而三个理由区块的 `media` 里**只有 `icon`**，没有一个角色落在上述集合内 → `fields.image` 为 `null` → 模板上 `data-cms-preview-field-path` 为空。`useCmsDraftPreview.ts` 第 400-411 行随即把「有 media role 但无 field path」的元素自动标记为只读（`data-cms-preview-readonly="media-pending"`），于是面板只剩静态提示。

2. **工作台「添加素材」把角色写成空字符串**（`module.vue` 的 `addPageMedia`：`push({ media_asset_id: assetId, role: '' })`）。空角色不匹配任何绑定，所以**即使操作员补了素材，背景依旧只读**——这正是"仍然无法修改"的直接原因。

**修复**：

- 代码：`module.vue` 新增 `defaultPageMediaRole(section, assetId)`，从素材自身登记的 `placement_key` 推导角色（`…background` → `background`，`…icon` → `icon`）；首页机器位登记为 `…machine` 但绑定名是 `foreground`，做一次翻译。无可靠信号时按区块 `mode` 兜底（machine → foreground，photo → background）。`addPageMedia` 改为写入推导出的角色。
- 数据：三张背景素材已存在但未挂载，需在各理由区块补上对应 media 条目：
  | 区块 | 角色 | 素材 |
  | --- | --- | --- |
  | performance（增效降损，machine） | `foreground` | 89 增效降损设备图 |
  | advanced-manufacturing（先进智造，photo） | `background` | 90 先进智造背景图 |
  | industry-leadership（行业领军品牌，photo） | `background` | 91 行业领军背景图 |

**验收**：新增 `cms/scripts/verify-reason-background-binding.mjs`，对比绑定前后的画布属性。结果：绑定后 `field-path=media.1`、`readonly` 为空（可替换）；未绑定的区块仍是 `field-path` 为空、`readonly=media-pending`。脚本自还原数据。

### 2026-09-26 预览画布图片加载失败的排查方法

**结论：截图中的破损图片无法用当前数据复现**（公开页与预览画布各探测一轮，图片请求全部 200、DOM 无 `naturalWidth===0`）。但失败路径是确定的，按下列顺序排查即可定位。

**画布图片分两类，失败特征完全不同**：

| 类型 | URL 形态 | 正常状态 |
| --- | --- | --- |
| 静态回退图 | `/assets/psd/...` | 200，直接由 Nuxt 提供 |
| 受管素材（走代理） | `/api/preview/media/{assetId}` | 200，带 cookie 的同源代理 |

**代理端点的 5 个失败分支**（`website/server/api/preview/media/[assetId].get.ts`）：

| 状态 | 触发条件 |
| --- | --- |
| 401 | 预览会话 cookie 缺失或已过期 |
| 404 | 该素材不在**当前预览会话的授权快照**内 |
| 404 | 素材状态不是 draft/unpublished 或 published/published |
| 503 | `cmsMediaAssetsUrl` / `cmsBffToken` 未配置 |
| 502 | 从 CMS 取文件失败 |

**最需要留意的两点**：

1. **会话有效期只有 15 分钟**（`CMS_PREVIEW_SESSION_TTL_MS = 15 * 60 * 1000`），且会话存**内存**。超时或 **Nuxt 重启**后，所有代理图会**同时**变成 401——表现就是"这些图片都加载不出来"。实测无 cookie 请求 `/api/preview/media/48` 返回 401，而静态图返回 200。
2. **授权快照在会话创建时生成**。画布中新绑定的素材不在快照里，会 404，直到保存页面触发会话续期（`renewLivePreviewAfterSuccessfulSave`）。所以"绑定后立刻破图、保存后恢复"是预期现象。

**排查清单**：Network 面板过滤 `preview/media`，看状态码定位分支；对照 `collectPreviewMediaAssetIds`（`website/server/services/cms-preview-media.mjs`）确认素材 id 是否会被收进授权集合；检查素材的 `status`/`publication_state`/`enabled`；确认 `placement_key` 与画布槽位一致。

**回归**：CMS 541/541、官网 466/466。

### 2026-09-26 横向滚动背景：渲染链路断裂（比角色问题更深一层）

上一节修好了"画布能选中"，但实测发现**绑定后公开页仍然不变**。深挖后找到第二个、更根本的问题。

**证据**：绑定素材 90 后对比

| 位置 | 结果 |
| --- | --- |
| 预览画布 | `src=/api/preview/media/90`、`field-path=media.1` ✅ |
| **公开页** | `src=/assets/psd/reason-factory-full.jpg` —— **完全没变** ❌ |

**根因**：`shared/page-sections.mjs` 第 37-38 行，`image` / `icon` 只从区块的**纯文本字段**取值，**从不读 `media` 数组**。而 `hero`（`index.vue` 第 218 行）和 `history`（第 225 行）都会读 media —— **唯独理由场景漏了这条链路**。

于是出现最迷惑的现象：画布能选图、预览能看到（预览走元素级 patch），**公开页永远用代码常量**。

**修复**：新增 `website/shared/homepage-reason-media.mjs`，提供 `resolveReasonImage` / `resolveReasonIcon`，在 `rebuildHomepageDerivedContent` 中把理由的 `image` / `icon` 接到区块 media 上。

角色集合与画布绑定（`mediaFieldForRoles`）**完全对齐**：`['background','foreground','image','photo','primary']`。这里刻意**不用** `selectSectionMediaEntry`，因为它会回退到「空角色」条目 —— 那会造成"图渲染出来了、但画布仍报静态"的矛盾状态（项目里制造页 `core-equipment` 就存在一个空角色条目）。

**优先级**：绑定的受管素材 > 区块文本字段 > 代码常量。草稿素材在 reader 解析前没有 `path`，自然回落，不会把页面改坏。

**验收**：新增 `website/test/homepage-reason-media.test.mjs`（8 例），覆盖受管素材优先、machine 模式走 foreground、草稿未解析时回落、文本字段次之、角色不匹配被忽略、空角色不当作背景、空值安全、角色集合与画布对齐。

**重要前提**：当前库中 **122 个素材全部是 draft/unpublished，且 `copyright_status` 多为 `pending_review`**。因此公开页看不到任何受管素材——这不是缺陷，是素材还没走完审核发布。要让改动真正上线，需要先完成素材的授权与发布。

**回归**：官网 474/474（466 + 8 新增）。

### 2026-09-27 三条背景绑定已执行

以管理员身份执行绑定，三处全部写入成功：

| 区块 | 角色 | 素材 |
| --- | --- | --- |
| performance | `foreground` | 89 增效减损设备图 |
| advanced-manufacturing | `background` | 90 先进智造背景图 |
| industry-leadership | `background` | 91 行业领军背景图 |

执行脚本 `cms/scripts/bind-homepage-reason-media.mjs`，**默认 dry-run**，加 `--apply` 才写入，且**幂等**（重跑只跳过、不重复不重排）。

**画布验收**（`cms/scripts/verify-all-reason-slots.mjs`）：

| 场景 | mode | role | placement | field-path | readonly |
| --- | --- | --- | --- | --- | --- |
| performance | machine | foreground | home.reason.machine | `media.1` | 空 |
| advanced-manufacturing | photo | background | home.reason.background | `media.1` | 空 |
| industry-leadership | photo | background | home.reason.background | `media.1` | 空 |

`allEditable: true` —— 三个槽位均可替换。

**公开页验收**：3 个场景、0 张破损图、0 个非 200 图片响应。仍全部走静态兜底（素材是草稿，无公开路径），符合预期，无回归。

**下一步（需要内容/法务确认，未执行）**：要让改动真正上线，需完成素材的授权与发布 —— 将 `copyright_status` 由 `pending_review` 改为 `owned`/`licensed`/`authorized`，再走审核发布流程。

### 2026-09-27 图片已发布，但发现整站未发布（第四层原因）

用户确认"这些图都可以用"后，完成素材发布：

| 素材 | 结果 |
| --- | --- |
| 89 增效降损设备图 | published / copyright=owned |
| 90 先进智造背景图 | published / copyright=owned |
| 91 行业领军背景图 | published / copyright=owned |
| 143 / 144 / 145 横移图标 | published / copyright=owned |

图标也必须发布 —— 否则发布页面时会报 `Referenced media asset 143 is not published`。

**但公开页仍显示静态兜底图。** 继续追查，发现更根本的一层：

**`website/server/services/cms-page-reader.mjs` 第 5 行要求 `status=published` 且 `publication_state=published`。而当前 CMS 里所有内容都是 draft/unpublished。**

用发布就绪端点（`GET /publication-readiness/`）拿到全量清单：

```
summary: { ready: 0, blocked: 396 }
series 6 / product 29 / parameter 190 / manufacturing 3 / qualification 20 /
milestone 6 / service 10 / article 3 / page 6 / setting 1 / media 122
```

**396 条内容全部被阻塞，没有一条就绪。** 主要阻塞项：

| 数量 | 阻塞原因 |
| --- | --- |
| 390 | 未完成发布 |
| 122 | 文件元数据不完整 |
| 110 | 版权状态待审核 |
| 23 | 受控媒体未关联 |
| 20 | 颁发方 / 授权状态待确认 |
| 15 | 证书编号 |
| 9 | SEO 信息 |
| 8 | 系列归属待产品负责人确认 |

**首页自身的阻塞**：`未完成发布 / SEO 信息 / 宣传声明待审核`。其中 `seo` 字段为空对象 `{}`；三个区块带 `requires_claim_review: true`（判定见 `reports/publication-readiness-report.mjs` 第 82 行）——正是"效能提升50%，丝损降低30%""30年技术沉淀""产品销量稳居全国第一"这类需要人工背书的营销声明。

**结论**：公开站当前 100% 运行在代码兜底常量上，因为没有任何 CMS 内容通过发布门禁。图片能否上线取决于整站发布，而整站发布卡在 SEO 填写与营销声明审核上 —— 这两项属于内容/合规决策，不应由脚本代为完成。

**过程中的一次回退（已完成）**：为验证链路，曾把首页推到 `scheduled`，随后用内容版本恢复（`POST /content-version-restore/6587/restore`）回到 `draft`。注意该恢复会一并回退内容快照，导致媒体绑定丢失，已重新绑定并复核。

**新增脚本**：

- `cms/scripts/publish-content-records.mjs` —— 走完 `draft→review→scheduled→published`。因工作流把 `draft→review` 限定给 content_editor（管理员在该分支外，会得到 `INVALID_TRANSITION`），脚本临时创建一个编辑器账号执行这一步、用完即删。默认 dry-run，`APPLY=1` 才执行，支持 `COLLECTION=` 指定集合。

### 2026-09-28 编辑器完成度实测

用 `cms/scripts/audit-editor-coverage.mjs` 逐页打开画布，统计**可编辑槽位 vs 静态只读槽位**：

| 页面 | 文字槽位 | 媒体槽位 | 媒体可编辑 | 媒体静态 | 媒体可编辑率 |
| --- | --- | --- | --- | --- | --- |
| 网站主页 | 97 | 22 | 17 | 4 | 77% |
| 产品展示 | 106 | 13 | 12 | 1 | 92% |
| 视频新闻 | 15 | 4 | 3 | 1 | 75% |
| 关于瑞钧 | 157 | 46 | 41 | 5 | 89% |
| 先进制造 | 83 | 44 | 34 | 10 | 77% |
| 服务支持 | 287 | 33 | 33 | 0 | 100% |
| **合计** | **745** | **162** | **140** | **21** | **87%** |

**解读**：文字槽位覆盖充分（745 个可编辑），媒体槽位约 87% 可替换。剩余 13% 是模板中的静态图位（无绑定），属于设计取舍而非缺陷——它们需要先在 Nuxt 模板中新增经确认的版式位置才能变为可编辑，工作台里对这类槽位会明确提示"此为静态素材"。

**脚本说明**：入口名随工作台版本变化，脚本用文本匹配而非精确角色匹配；首页因面板较重，需先直接查找条目再回退到点栏目。已开着的预览不会重新发出 edit-mode 属性，所以每个目标之间会重载页面。

### 2026-09-28 编辑器问题的修复

针对上一节列出的问题逐项修复。

**1. 静默失败（已修）**

根因在 `content-publication-workflow.mjs` 第 161 行：`target` 只看 `status` 字段。当客户端只发 `{ publication_state: 'published' }`（没有 `status`）时，`target` 仍是 `draft`，命中"草稿改草稿"分支，**payload 里的 `publication_state` 被静默覆盖成 `unpublished` 并返回 200**。

修法要区分两种形态，否则会破坏既有的防伪造测试：

- 带 `status` 转换的请求：`publication_state` 视为冗余/伪造值，继续忽略（保持原行为）
- **只发 `publication_state`**：无法生效，直接报 `PUBLICATION_STATE_DERIVED`（400）

实测：`httpStatus: 400`、`stateUnchanged: true`、`noFalseSuccess: true`。

**2. 管理员不能提交审核（已修）**

原工作流把 `draft → review` 限定给 `content_editor`，管理员不在该分支。新增一个 `system_admin` 分支：管理员可以**发起**审核，但**仍不能跳过发布门禁**（`draft → published` 依旧 `INVALID_TRANSITION`）。

实测：管理员发 `{ status: 'review' }` 返回 200、状态变为 `review`；发 `{ status: 'published' }` 仍被拒。

**3. 预览会话脆弱（已修）**

会话原来**从创建起固定 15 分钟**，活跃编辑也会被踢掉。改为**滑动续期**：每次访问都把过期时间往后推，只有真正闲置超过窗口才失效。

**4. 版本恢复静默覆盖内容（已修）**

`POST /content-version-restore/{id}/restore` 会整体覆盖记录，之后的改动全部丢失，且不提示。新增闸门：若该版本之后还有更新版本，返回 **409 + `NEWER_VERSIONS_EXIST`**，并报告将丢弃多少次改动；需携带 `confirmDiscardNewer: true` 才继续。前端 `content-version-manager` 同步处理：弹出确认框，取消则明确提示"已取消恢复，内容未被修改。"。

实测：`httpStatus: 409`、`newerVersions: 5`、页面未被修改。

**5. 素材未发布时报错不友好（已修）**

原报错只给 ID（`Referenced media asset 143 is not published`），运营无法行动。改为**指名素材标题与用途**并给出下一步：

> 引用的素材「首页横移图标 - 增效降损」（用途：home.reason.icon）尚未发布（当前状态 draft/unpublished）。请先在「媒体资产」中完成版权确认与发布，再发布本内容。

**6. 绑定对了 ≠ 页面会变（已于 09-26 修复）**

见前述 `homepage-reason-media.mjs`。

**测试**：CMS 546/546、官网 475/475。新增用例覆盖：单独设置 `publication_state` 被拒（管理员与编辑各一）、带转换时仍被中和、管理员可提交审核但不可跳过发布、会话滑动续期与闲置过期、恢复闸门 409 且不写入、报错指名素材。

**集成脚本**：`cms/scripts/verify-publication-guards.mjs` —— 实测三项守卫（静默失败、管理员提交审核、恢复闸门），自还原状态。

### 2026-09-28 Nuxt 前端可修改程度盘点

**结论：内容层可修改程度高，结构层与少量硬编码文案需要改代码。**

**文字**：745 个 CMS 绑定槽位；模板中残留的硬编码中文仅 **108 处**，且多为内部 UI 文案（预览页的"草稿预览""仅供内容审核使用"）、媒体槽位提示（"机器前景素材"）。**但其中混有真实内容** —— 见下方 `about.vue`。

**媒体**：161 个槽位中 140 个可替换（87%）。剩余 21 个静态槽位分四类（`cms/scripts/audit-static-media-slots.mjs` 可复现）：

| 类别 | 数量 | 页面 | 说明 |
| --- | --- | --- | --- |
| 装饰性图层 | 10 | 先进制造 | `manufacturing-psd/layers/*.png`，是拼合成整幅画面的 PSD 分层，单独替换会破坏设计 |
| 视频海报/结束帧 | 3 | 网站主页 | 由首屏视频派生，跟随视频而非独立素材 |
| **已登记用途但未接线** | 4 | 关于瑞钧 | 有 `about.hero.background`、`about.hero.foreground`、`about.timeline.background` 等用途名，但没有绑定 → **属于可补的接线缺口** |
| 机型图 | 1 | 产品展示 | `machine_asset_id` 为空时无绑定；绑定受管素材后即可编辑 |

**发现一处内容硬编码**：`website/pages/about.vue` 第 722 行，工厂地址、电话、邮箱直接写在模板里 ——

```html
<address><p>常熟工厂：江苏省苏州市常熟市沙家浜儒浜路78号</p><p>昆山工厂：…巴城苏杭路88号</p><p>热线：13738375470<br>外贸：17751119936</p><p>国内邮箱：ksrjjx@126.com<br>外贸邮箱：kylewuedm@gmail.com</p></address>
```

改这些必须动代码。**而服务支持页的办事处信息是可编辑的**（工作台有"区域与直属办事处"编辑器）—— 同类内容两套做法，建议统一。

**结构性改动**（版式、栅格、区块增删）仍需改 Nuxt 模板；工作台对这类槽位会明确提示"此为静态素材…如需展示，必须先在 Nuxt 模板中新增经确认的版式位置"，不会给出无效控件。

### 2026-09-28 静态媒体槽位的处置方案（含上一轮分类修正）

**修正**：上一轮把"先进制造 10 个"整体归为"装饰性 PSD 图层、设计使然"，不够准确。实际查证后：

- 先进制造整页是**硬编码的 PSD 图层清单**（`manufacturing.vue` 第 13 行 `const asset = (name) => /assets/manufacturing-psd/layers/${name}.png`，第 59 行起是 75 个带绝对坐标 `x/y/width/height` 的图层定义）。页面**从不读 CMS**。
- 我扫到的 10 个静态槽位是**卡片背景与页脚装饰**（`cnc-card-background`、`assembly-card-background`、`electrical-card-background`、`hero-panel`、`footer-*`），**没有对应的注册素材** → 属于设计使然。
- 而注册的 20 个 `manufacturing.layer` 素材是**真实设备照片**（`cnc-main`、`metal-bending-center`、`inspection-coordinate`…），与 `public/assets/manufacturing-psd/layers/` 下的文件 1:1 对应（该目录共 75 个文件）。这些是另一批槽位，不在这 10 个之列。

**按"能否立即执行"分档：**

**A 档 —— 素材已登记，纯数据绑定，零代码改动（4 个槽位，可立即做）**

| 槽位 | 区块 | 角色 | 素材 |
| --- | --- | --- | --- |
| 首屏视频海报 | 首页 hero | `poster` | 48 首页首屏视频备用海报 |
| 首屏背景 | 关于瑞钧 hero | `background` | 189 关于瑞钧首屏背景候选 |
| 首屏机器前景 | 关于瑞钧 hero | `foreground` | 294 关于瑞钧首屏机器前景候选 |
| 时间轴背景 | 关于瑞钧 history | `background` | 87 / 152 |

首页 hero 的海报槽位**模板已经写好**（`index.vue` 第 315 行有字段路径，且引导语明确写了"请在首页首屏图片与背景中添加 home.hero.poster 素材，展示位置填写 poster"）——只差绑定。注意各区块的 `media` 目前**都是空数组**。

**B 档 —— 需要改模板（2 处，一次改造覆盖多个槽位）**

1. **产品展示机型图**：`displayImageFieldPath` 在 `machine_asset_id` 为空时返回 `''`，导致槽位**没有绑定入口**——操作员连"绑一张"都做不到。应始终返回该字段路径，绑定后才覆盖静态兜底。
2. **先进制造图层**：`asset()` 是硬编码路径构造器。应改为**优先取 CMS 绑定、回落静态路径**，一次改造覆盖全部 75 个图层。注意图层是绝对定位（固定 `x/y/w/h`），替换时需校验宽高比，否则会破版。

**C 档 —— 需先登记素材（2 个槽位）**

首页 `history` 背景、关于瑞钧 `overview` 背景：目前没有对应的注册用途（素材前缀分布里只有 `home.reason`/`home.hero`/`about.hero`/`about.timeline` 等，没有 `home.history`/`about.overview`）。需先在"媒体资产"登记用途。

**方法论建议**

1. **建立"用途登记 ↔ 页面绑定"对账**。当前的问题不是缺能力，而是**缺对账**：素材登记了、页面没绑，没人会发现。`audit-static-media-slots.mjs` 已经能列出静态槽位，再加一步"反查是否有同名注册用途"即可产出缺口清单。
2. **空槽位也要有绑定入口**。B 档第 1 条是典型：没有绑定入口时，运营无法自助解决，只能找开发。
3. **提示语要区分两种"不能改"**。现在画布对"设计上不可改"和"尚未接线"给的是同一句"此为静态素材"。应分别提示"此图层为版式组成部分，不可单独替换"与"尚未绑定，请添加素材"，让运营能判断是自己能解决还是要找开发。
4. **优先做 A 档**：4 个槽位、纯数据绑定、可随时回退，风险最低且立刻见效。

### 2026-09-28 上述建议的落地结果

**A 档：已绑定 5 处**（`cms/scripts/bind-section-media.mjs`，默认 dry-run、`--apply` 写入、幂等）

| 页面 | 区块 | 角色 | 素材 |
| --- | --- | --- | --- |
| 首页 | hero | `poster` | 48 |
| 首页 | history | `background` | 87 |
| 关于瑞钧 | hero | `background` / `foreground` | 189 / 294 |
| 关于瑞钧 | history | `background` | 87 |

首页 history 之所以能复用"关于瑞钧时间轴背景"，是因为 `page-preview-media-policy.mjs` 第 16-18 行**显式允许**这一组合，且 `index.vue` 第 230 行已按 `background` 角色解析。

**过程中发现并修正一处素材登记错误**：素材 48 的 `page_key` 为 `null`、`section_key` 为 `'image'`（那是媒体类型不是区块名），导致 `pageAllowsPreviewMedia` 第 20 行判定失败，**首页预览整体卡住**。修正为 `home` / `hero` 后恢复。全库仅此 1 例（另有 1 个无标题孤立上传 528，未处理）。

**效果**：关于瑞钧静态槽位 5→1、首页 4→2，全站可编辑槽位升至 **146**。

**B 档-1：已完成**。`displayImageFieldPath` 改为在无受管素材时仍返回 `configuration.machine_asset_id`，机型图槽位有了绑定入口；实测 `fieldPath` 有值、无 readonly，且仍回落静态图。

**提示语区分：已完成**。`useCmsDraftPreview.ts` 在标记只读时按**是否登记了用途**给出不同文案：

- 有用途 → 「尚未绑定受管素材。请在所在段落的「图片与背景」中添加素材，并把展示位置填写为 **poster**。」
- 无用途 → 「此素材是版式的组成部分，不能单独替换。如需更换，请在 Nuxt 模板中新增经确认的版式位置。」

模板自行声明的原因优先级更高（如"固定动画变形装饰，不属于 CMS 媒体字段"）。实测首页 4 条不同提示、先进制造 2 条，分类正确。

**对账脚本：已升级**。`audit-static-media-slots.mjs` 现在会反查每个静态槽位是否有同名注册素材，输出两张清单：

```
--- 已登记用途但页面未绑定（可立即修） ---
{"area":"网站主页","role":"background","placement":"home.hero.poster","section":"hero","registeredAssets":[48]}
--- 无登记用途（需改模板，或先在媒体资产登记） ---
{"area":"关于瑞钧","role":"background","placement":"","section":"overview",...}
{"area":"先进制造","role":"image","placement":"","section":"process",...} ×10
{"area":"视频新闻","role":"video","placement":"","section":"hero",...}
summary: { editableSlots: 146, wiringGaps: 2, byDesign: 12 }
```

**注意**：那 2 个"接线缺口"是首页的结束静帧——它们的用途 `home.hero.poster` 已登记，但需要的是**角色为 `end-frame` 的另一个素材**（素材 48 已用作 `poster`），所以还需先补一张素材。

**未做**：B 档-2（先进制造 75 个图层改为 CMS 优先）。原因是图层带绝对坐标，替换需校验宽高比，改动面大且需要设计确认，建议单独排期。

**回归**：CMS 546/546、官网 477/477。新增用例覆盖：只读提示的两类区分、模板自声明原因优先、机型图始终保留绑定。
