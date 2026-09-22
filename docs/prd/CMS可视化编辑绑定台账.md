# CMS 可视化编辑绑定台账

> 2026-09-09 跨新闻条目浏览器验收：完成第一条新闻 1036 的不同封面保存/刷新后，通过“切换预览条目”选择 1035，将其封面临时切换到资产 373，列表卡片 `data-cms-preview-item-id=1035` 内的目标图片请求 200 且 decode 成功。此第二条修改仅预览，未保存；两条临时文章、两份素材及文件随后均清理。对应会话授权仅接受最初签发的主条目或 related 集合内真实条目，未知条目测试仍拒绝。

> 2026-09-09 视频分享及全量回归：真实 Chrome 在临时空视频文章 1030 中先打开预览，再加入尚未保存的既有草稿视频 133，受保护播放器 `readyState=4`、视频宽度 2560 且成功播放。保存、整页刷新、认证 Directus 回读确认关联保留，临时文章已删除，既有素材未改动。全量测试官网 432/432、CMS 499/499 通过；CMS 原有一项旧函数调用文本断言已替换为当前入口连接检查及实际候选筛选行为断言。此证据覆盖新增视频关联的实时预览，不覆盖首页/服务视频等所有位置。

> 2026-09-09 动态新闻不同封面画布替换通过：两份临时图片分别来自 `_video-end-298.png` 与 `_video-end-304.png`，真实 Chrome 1440×900 点击封面后在“媒体替换”将资产 367 切换为 366；新图片请求 200、decode 成功，工作台保存后整页刷新仍回显 366。临时文章 1028/1029、资产 366/367 与对应文件均删除并回查为空，公开接口不含临时草稿。此前“仅回选同一素材”的验收缺口解除。工具栏按钮文字溢出问题亦经浏览器红测复现，设置子控件不收缩后复测通过；空间不足时保留横向滚动。当前证据不覆盖六页所有媒体位置。

> 2026-09-09 封面 404 后续验收：已通过 CMS 一次性素材许可→Nuxt 会话兑换→画布更新修复。真实 Chrome 1440×900：清空封面并保存，再选择未保存的草稿封面，进入列表卡片画布，图片请求 200 且 decode 成功；切换媒体工具并等待 iframe 工具状态同步，点击图片后属性栏命中 `articles/1024.cover_asset` 并回显资产 362。表单保存、整页刷新确认封面保留；公开列表排除草稿；临时文章、资产及文件全部删除回查。此次画布只重新选择同一素材，不代表两张不同图片的画布切换已验收。相关工作台/预览回归 169 项通过。截图 `C:/Users/zc123/AppData/Local/Temp/cms-cover-canvas-0909.png` 显示工具栏第二行仍有挤压，待修复；未改变官网模板布局。

> 2026-09-09 封面失败根因已由浏览器网络事件确认：`/api/preview/media/359` 返回 404（临时素材及文章均已清理）。复现流程为清空封面并保存→选择尚未保存的封面→打开预览→切换列表卡片画布。客户端收到新素材 ID，但服务器预览会话只包含签发时读取的已保存内容；当前 `/api/preview/session` POST 只交换令牌，不处理已授权的未保存素材更新。需增加由 CMS 编辑者授权、绑定当前预览目标的素材更新流程，再进行实时替换与保存刷新验收；不能放开匿名媒体读取或直接相信客户端任意素材 ID。

> 2026-09-09 动态新闻封面增量：已补齐 `news.dynamic_news.cover` 后端规格、工作台画布媒体筛选及 CMS/Nuxt 预览字段中的 `cover_media_asset_id`。API 验证器 `cms/scripts/verify-news-dynamic-cover-preview.mjs` 已验证上传字节、两次授权预览及公开列表排除草稿，并确认临时文章/媒体/文件删除。真实 PC 工作台验证仍未通过：先清空封面并保存，再选择草稿封面，切换“列表卡片画布”后出现图片节点，但 `HTMLImageElement.decode()` 返回 EncodingError。不得据 API 成功将实时替换标为完成；下一步检查未保存封面的预览会话素材授权更新及图片请求响应。

> 2026-09-09 栏目筛选：真实浏览器确认“动态新闻内容”当前为空、“视频分享内容”仅显示现有视频记录。增加独立栏目筛选状态和新建草稿类别继承；未修改现有业务记录。

> 2026-09-08 最新验收：产品型号资料列表 `product_models.resources` 已从“仅表单维护”升级为真实画布可编辑。产品详情资料区根节点绑定当前 `product_models/{id}`，每项类型、标题和链接分别使用 `resources.{index}.type`、`resources.{index}.title`、`resources.{index}.url`；英文区块眉题不再错误继承为不存在的 `product_models.kicker`。真实 PC 画布在 FL1610（`product_models/17`）临时创建资料后，三项均完成点击选中、即时预览、保存、管理员 Directus 回读和工作台重载保持；最终删除临时资料并再次保存，认证回读恢复 `resources=[]`，iframe 中 `VECHK` 计数为 0。网站全量测试 `429/429`、Nuxt 构建通过。本项未使用真实附件文件，因此不把附件媒体上传/替换计为完成。

> 2026-09-08 最新验收：服务支持 FAQ 与联系区块的 24 个可见文字字段现已全部完成真实 PC 画布可逆闭环。此前已单独验收 `content.faq_1_question` 与 `content.contact_sales_title`；本轮对其余 22 个字段逐项从 Nuxt iframe 真实绑定节点点击，属性面板均精确命中 `pages/3 · sections[support].content.<field>`，临时值即时进入画布。统一保存后，管理员受保护 Directus API 回读 22/22 字段一致，页面保持 `draft/unpublished`；点击工作台“重新加载”后，标题、问题和联系字段直接保持，FAQ 答案与 CTA 在重新展开对应 `<details>` 后逐节点确认保持。随后按保存前 API 快照逐项恢复，重新保存、认证回读和再次重载均通过，iframe 中 `VECHK-20260908` 标记为 0。此证据覆盖 FAQ 的 14 个字段和联系区块的 10 个字段，只证明草稿可视化编辑链路，不代表服务媒体、列表增删排序或公开发布完成。

> 2026-09-08 数据清理：最终全画布检查发现历史遗留的 `site_settings/1.footer.purchase_label=大批量采购-画布验收`。该值不属于本轮服务页测试，但会使“全站无测试残留”的结论失实；现已从页脚真实画布节点进入 `site_settings/1 · footer.purchase_label` 属性面板，恢复为代码默认及台账既定原文“大批量采购”，保存后认证 Directus 回读和工作台重载均确认，旧文案计数为 0。记录仍为 `draft/unpublished`。

> 2026-09-08 最新验收：修复服务支持 FAQ 与联系区块出现“画布路径正确但属性值为空、即时预览不更新”的两个独立缺陷。工作台现在会在画布集合和记录 ID 与当前预览一致时显式使用已规范化的活动页面草稿；Nuxt 实时预览净化器也明确允许 14 个 FAQ 与 10 个联系区块字段，同时继续剔除 `internal_note` 等非白名单字段。真实 PC 画布分别对 `pages/3.sections[support].content.faq_1_question` 和 `.content.contact_sales_title` 完成临时值即时显示、保存、管理员受保护 Directus `HTTP 200` 回读、工作台重新加载保持和原值恢复。最终回读为“报修前需要准备哪些资料？”与“设备选型与方案”，页面保持 `draft/unpublished`，iframe 中无 `画布验收-20260908` 残留。此证据证明两类字段共用的数据链路已打通，但只把这两个实测字段记为完整闭环；其余 FAQ/联系字段仍需逐项或分组抽样验收，不能据此宣称整个服务页或 CMS 已完成。

> 2026-09-08 最新验收：服务支持另外两项可见文字完成真实 PC 画布可逆保存闭环。页尾“需要人工协助？”精确对应 `pages/3.sections[support].content.human_support_label`；第 5 张服务入口“技术文件下载”精确对应 `pages/3.sections[support-actions].items.4.title`。两项均在实时 Nuxt iframe 点击真实可见节点后进入对应属性路径，临时文字即时显示，点击“保存页面草稿”后由管理员受保护 Directus API 回读；工作台“重新加载”后画布、属性路径和输入值均保持。最后分别恢复原文、保存、再次受保护回读和重新加载，`pages/3` 仍为 `draft/unpublished`，没有测试文案残留。此证据只覆盖两个文字字段，不代表服务入口图标、其它卡片、静态媒体或公开发布完成。

> 2026-09-08 最新验收：服务入口第 6 至第 8 张卡片标题也完成真实 PC 画布可逆闭环：`pages/3.sections[support-actions].items.5.title`（“常见故障分析”）、`.items.6.title`（“保养与易损件”）及 `.items.7.title`（“知识分享”）。每项都从对应 iframe 按钮精确选中，属性面板路径、临时文字即时渲染和页面草稿保存均逐项验证；管理员受保护 Directus 回读同时确认三项草稿值，重新加载后画布与属性面板仍命中各自索引。随后逐项恢复原文并保存，最终受保护回读和重载确认四项后半段标题 `items.4` 至 `.items.7` 均为原值。此项仅覆盖标题文字，不代表卡片说明、图标、下载附件或公开发布完成。

> 2026-09-08 最新验收：服务支持“在线售后服务”区块的 12 项内容字段完成真实 PC 画布可逆保存闭环：`content.online_title`、`content.online_intro`、`content.assistant_brand`、`content.assistant_heading`、`content.assistant_intro`、`content.assistant_cta`、`content.step_1_title`、`content.step_1_body`、`content.step_2_title`、`content.step_2_body`、`content.step_3_title`、`content.step_3_body`。管理员从工作台实时 Nuxt iframe 逐项点击可见节点，属性面板均精确显示 `pages/3 · sections[support].content.<field>`；临时值即时进入画布，保存草稿后通过受保护 Directus 回读，并在工作台“重新加载”后保持。验收结束将所有字段恢复原文并再次保存；最终回读确认页面仍为 `draft/unpublished` 且没有测试文案残留。此证据只覆盖该在线服务区块的文字内容，不代表服务首屏静态媒体、服务入口图标或公开发布完成。

> 2026-09-01 最新验收：先进制造首屏背景 `pages/8.sections[hero].media.0` 完成真实 PC 草稿媒体替换、保存、重载与恢复闭环。工作台可选择内部草稿 `hero-building.png`（`media_assets/55`）；填写受控展示位置 `hero-building` 并保存后，iframe 媒体模式直接点击“瑞钧智科生产基地”准确选中该路径，属性面板回显已选素材，实际图片来源为受保护 CMS 地址 `/assets/897c4e26-d1bf-4650-ad38-f897fc754afa`。完整重新加载后关联仍存在；已移除测试关联并保存，静态 fallback 恢复。截图：`output/playwright/manufacturing-hero-media-restored-20260901.png`。候选画面与原图相同，因此不将其描述为可见内容差异；全部仍为 `pending_review/draft/unpublished`，不属于公开发布。

> 2026-09-01 最新验收：服务支持“国内直属办事处”第三地区标题 `pages/3.sections[office-directory].items.2.title` 完成真实 PC 画布保存、重载和恢复闭环。iframe 直接点击“珠三角区”，属性面板精确命中完整嵌套路径；临时改为“珠三角区-画布验收”即时进入画布，保存后显示已保存，工作台重新加载后 iframe 与属性面板仍保持测试值。随后同一路径恢复“珠三角区”、保存并再次重载确认原值已恢复，未留下测试文字。此项仅覆盖该标题文字，不代表地区图片、地图或公开发布已完成。

> 2026-09-05 真实媒体预览闭环：关于瑞钧 `pages/2` 的合作品牌、国内客户、国外客户和厂区图库分别使用 `partners.media[partner-1]`、`clients-domestic.media[domestic-1]`、`clients-global.media[global-1]`、`factory.media[factory-1]` 写入受治理草稿素材。串行运行 `cms/scripts/verify-about-client-media-preview.mjs`、`verify-about-factory-media-preview.mjs`、`verify-about-partner-media-preview.mjs` 均确认 Directus 保存、受保护 Nuxt 预览 HTML 渲染、客户区块不串写，并在 `finally` 中恢复完整 `pages/2.sections` 快照。素材仍为 `draft/unpublished/pending_review`，此证据只证明内部预览可替换，不代表公开发布或版权审核完成。

> 2026-09-01 修复验收：先进制造“生产核心设备”首张卡图 `pages/8.sections[core-equipment].media.0` 已绑定的内部草稿素材 `media_asset_id=50` 现在会在真实画布属性面板回显为已选 `equipment-1.png · image/png`。修复后的读取仅接受受治理媒体关系、白名单标量字段和 `media/assets` 列表项，不会把普通文字误显示为媒体；透明“放大查看平面磨床”按钮在媒体模式也能精确选中该媒体路径。截图：`output/playwright/manufacturing-core-equipment-media-selection-restored-20260901.png`。当前无第二份匹配候选素材，故尚未验证不同媒体的替换、保存、重载和恢复，不能计为媒体替换或公开发布闭环。

> 2026-09-01 最新验收：服务支持第 4 张服务入口卡片说明 `pages/3.sections[support-actions].items.3.description` 完成真实 PC 画布保存、重载和恢复闭环。临时新增“视频教学内容说明”后，iframe 直接点击 `<small>` 正文，属性面板精确命中完整嵌套路径；保存后认证 Directus 回读 `HTTP 200`、`draft/unpublished`，同时相邻第 3 张卡片说明保持空值。工作台重载后画布保持测试值；随后从同一属性面板恢复为空，再次认证回读为空且重载后临时文字不存在。截图：`output/playwright/service-support-action-fourth-description-saved-20260901.png`。本项只覆盖第 4 张卡片说明文字，不代表服务入口图案、图片或公开发布已完成。

> 2026-09-01 最新验收：服务支持第 3 张服务入口卡片说明 `pages/3.sections[support-actions].items.2.description` 完成真实 PC 画布保存、重载和恢复闭环。表单临时新增“寄修流程与进度说明”后，iframe 直接点击 `<small>` 正文，属性面板精确命中完整嵌套路径，而非父级按钮；保存后认证 Directus 回读 `HTTP 200`、`draft/unpublished`，工作台重载后画布保持测试值。随后从同一属性面板恢复为空，再次认证回读为空且重载后临时文字不存在。截图：`output/playwright/service-support-action-third-description-saved-20260901.png`。本项只覆盖第 3 张卡片说明文字，不代表服务入口图案、图片或公开发布已完成。

> 2026-09-01 最新验收：先进制造“智能物料仓储”标题 `pages/8.sections[smart-warehouse].title` 完成真实 PC 画布保存、重载和恢复闭环。临时修改即时显示，保存后认证 Directus 回读为测试值；完整重载后工作台表单、中央 Nuxt 画布和属性面板均保持；恢复原文后认证回读确认 `title=智能物料仓储`。截图：`output/playwright/manufacturing-smart-warehouse-title-restored-20260901.png`。本项只覆盖标题文字，不代表该区域图片或媒体已完成。

> 2026-09-01 最新验收：服务支持第 4 张适用型号卡片 `pages/3.sections[support-models].items.3.label`（“FT-XS”）完成真实 PC 画布保存、重载和恢复闭环。临时修改即时显示，保存后认证 Directus 回读为测试值；重载后工作台表单、属性面板和卡片均保持；恢复后认证读回确认第 1、2 项仍为“灵动工作站”“FR-XS(auto)”，第 4 项恢复“FT-XS”。截图：`output/playwright/service-support-model-fourth-restored-20260901.png`。本项只覆盖卡片名称，不代表卡片图标或图片已完成。

> 2026-09-01 最新验收：服务支持搜索按钮文案 `pages/3.sections[support].label` 完成真实 PC 画布保存、重载和恢复闭环。编辑模式点击 iframe 的“咨询 AI”后属性面板精确命中该路径；临时修改即时显示，保存后认证 Directus 回读为测试值；重载后工作台表单、属性面板和按钮均保持；恢复原文后认证回读确认 `supportLabel=咨询 AI`，`supportDescription` 未改变。截图：`output/playwright/service-support-label-restored-20260901.png`。本项只覆盖按钮文案，不代表服务入口图标或图片已完成。

> 2026-09-01 最新验收：服务支持搜索框提示词 `pages/3.sections[support].description` 完成真实 PC 画布保存、重载和恢复闭环。iframe 点击真实输入框后属性面板精确命中该路径；临时修改即时显示，保存后认证 Directus 回读为测试值；重载后工作台表单、属性面板和输入框均保持；恢复原文后认证回读确认 `supportDescription=输入设备型号、故障现象、维修进度或保修问题`。截图：`output/playwright/service-support-description-restored-20260901.png`。本项只覆盖提示文字，不代表服务入口图标或图片已完成。

> 2026-09-01 最新验收：`product_models/17.configuration.features.3.label`（FL1610“全新3.0控制系统”）完成真实 PC 画布保存、重载和恢复闭环。临时修改为“全新3.0控制系统-画布验收”即时进入画布，保存后认证 Directus 回读仅第 4 项为测试值；重载后表单、iframe 和属性面板均保持；恢复后认证回读确认 FL1610 四项能力标题均为原文。截图：`output/playwright/product-FL1610-all-feature-labels-restored-20260901.png`。本项只覆盖第四项标题文字，不代表能力图片、说明或工程图已完成。

> 2026-09-01 最新验收：`product_models/17.configuration.features.2.label`（FL1610“辅助上丝功能”）完成真实 PC 画布保存、重载和恢复闭环。重新进入产品型号工作台时默认记录会回到 FL1180，验收先明确切换到 `FL1610 / product_models/17`，避免同文案跨记录串写。临时修改为“辅助上丝功能-画布验收”即时进入画布，保存后认证 Directus 回读为测试值；工作台重载后表单和 iframe 均保持；随后恢复原文并再次认证回读确认 `feature2Label=辅助上丝功能`。截图：`output/playwright/product-FL1610-feature-3-restored-20260901.png`。本项只覆盖第三项标题文字，不代表能力图片、说明或工程图已完成。

- 版本：v1.1
- 日期：2026-08-27
- 状态：P0 编辑正确性已完成运行验证；P1 媒体与列表待进入真实业务素材闭环
- 关联基线：[CMS可视化编辑继续执行 PRD v1.7](CMS可视化编辑继续执行PRD-v1.7-重修整理执行稿.md)

## 使用规则

本表只记录当前代码和受保护 Directus 回读能够证明的绑定。`已声明`表示 Nuxt 模板有明确的 `data-cms-preview-collection/item-id/field-path` 或页面区块绑定；它不是保存成功证据。`已闭环`必须另有画布选中、即时预览、工作台保存、受保护回读、刷新一致和原值恢复记录。

所有当前页面记录均为 `draft/unpublished`：首页 `pages/1`、产品 `pages/7`、先进制造 `pages/8`、视频新闻 `pages/9`、关于瑞钧 `pages/2`、服务支持 `pages/3`。公开接口、静态 PSD 和 fallback 不能当作已发布 CMS 内容。

## 本轮修复：安全清理空白视频新闻草稿

- 2026-09-01：工作台为文章/视频内容增加“删除当前草稿”，但仅在记录严格为 `draft + unpublished` 时显示。其余状态不展示入口，防止内容编辑端绕过审核或误删正式资讯。
- 真实 Chrome 删除了 `articles/10` 这条系统默认空草稿：标识为 `cms-editor-article-1787540422223`，标题“未命名文章”，且摘要、正文、媒体和来源均为空。确认删除后“动态新闻内容”列表为 `0`，旧详情 iframe 关闭，编辑区改为“请选择或新建一条文章草稿”。截图：`output/playwright/news-empty-draft-cleanup-20260901.png`。
- 此项是后台草稿清理与防误删能力，不把“新闻列表已有正式业务内容”或“视频媒体已可发布”误计为完成。

| 状态 | 含义 |
| --- | --- |
| 已闭环 | 达到完整保存与回读验收 |
| 已声明待闭环 | 页面有精确绑定，尚未完成工作台保存验收 |
| 只读/待媒体 | 仅有 PSD/static fallback，或没有正式媒体与真实 ID |
| 待建模 | 页面可见但目前无法构造稳定保存目标 |

## 本轮修复：首页三大特点画布显示完整写入路径

- 2026-09-01：真实 Chrome 中，`网站主页 -> 三大特点` 的 iframe 点击“先进智造”会选中 `advanced-manufacturing.introTitle`。旧属性面板只显示 `pages · introTitle`，不足以区分同页三条理由的同名字段，存在人为串写判断风险。
- 按 TDD 先增加失败断言，再让工作台对页面集合显示 `pages · sections[{sectionKey}].{fieldPath}`；非页面集合仍保持原有 `collection · fieldPath` 格式。扩展使用项目 Node 22 重建、Directus 重启后，真实面板显示 `pages · sections[advanced-manufacturing].introTitle`，并保留文字、位置和样式编辑控件。截图：`output/playwright/home-advanced-manufacturing-full-path-focus-20260901.png`。
- 该修复只增强选择来源的可读性，不改变保存值、Nuxt 公开布局、已有媒体治理或发布状态。

## 本轮运行验证：全站页脚文字可视化编辑闭环

- 2026-08-27：修复 `PsdFooter` 在画布编辑模式中被 scoped CSS 错误编译、导致文字 `pointer-events:none` 的问题。现通过非 scoped 的受限状态规则，仅当 iframe 接收到 PC 编辑模式时允许页脚文字点击；普通官网浏览仍保留原有链接行为。
- 真实浏览器从 `网站主页 -> 首页视频` 打开 Nuxt iframe，点击页脚“产品中心”后，工作台属性栏显示 `site_settings · footer.columns.0.title`。属性栏初值与画布一致，不再是空字段。
- 页脚 `site_settings` 原记录只有旧的 `primary_links`，不足以支持 PSD 中三栏文字编辑。工作台现在用受控三栏、联系信息和采购区默认模型补全缺失字段；局部覆盖不会清空同栏链接。保存仅 PATCH `footer` 或 `contacts` 根对象，不要求伪造品牌媒体，也不会写入 `brand`、导航或审核元数据。
- 真实 E2E：将“产品中心”临时改为 `产品中心-TDD`，iframe 即时更新；点击保存后认证 Directus 回读 `footer.columns[0].title` 为临时值，完整刷新工作台和重开画布后仍保持；随后以同一路径恢复“产品中心”，最终回读确认原值恢复，`footer.columns[0].links[0].label` 仍为“灵动切割工作站”。
- 该闭环覆盖页脚所有文字字段的共同保存模型；页脚 Logo、地址/电话/邮箱小图标仍需要正式受治理媒体后才可进行媒体替换验收。

## 本轮运行验证：先进制造 CNC 核心设备说明实时预览

- 2026-08-28：真实 PC 工作台进入“先进制造 -> CNC车间”，画布点击“核心设备：”后，属性栏精确显示 `pages · detail`，目标为 `pages/8.sections[precision-machining].detail`。
- 首轮临时修改时右侧属性栏、未保存状态和保存后的认证 Directus 回读均正确，但等待 900ms 后 iframe 仍保留旧的三行文字。核查确认工作台更新消息包含完整 `sections`，缺陷位于 Nuxt 预览安全净化白名单遗漏 `detail`，并非防抖时序或保存目标错误。
- 按 TDD 补充失败测试后，预览端仅允许此已有数据模型的 `detail` 字段，不透传内部字段。修复后临时文案立即显示于 iframe；保存、认证回读和完整重载一致。最终恢复“核心设备：\n五面体龙门、五轴数控、立式、卧式等\n各类加工中心、平面磨床、导轨磨床”，最终认证回读确认原值，页面仍为 `draft/unpublished`。
- 2026-08-28：同一真实 PC 路径独立验证 `pages/8.sections[sheet-metal].detail`。画布选中钣金车间“智能核心设备”说明后，属性栏准确为 `pages · detail`；临时值在 900ms 内出现于 iframe，保存、认证回读和完整重载均一致。恢复两行原说明后认证回读确认原值，页面仍为 `draft/unpublished`。这证明 `detail` 安全透传覆盖另一个区块，但不代表制造页全部文字、媒体或列表已经验收。

## 本轮运行验证：首页三大特点正文与中等桌面画布

- 2026-08-27：真实工作台进入“网站主页 -> 三大特点”，在 Nuxt PC 画布点击“增效降损”的横移图文正文，属性栏精确显示 `pages · body`，初值为 `效能提升50%，丝损降低30%`。
- 以临时值 `先进制造-TDD` 进行验证：画布即时同步，点击“保存草稿”后认证 Directus 回读 `pages/1.sections[performance].body` 为临时值；完整刷新工作台并重新打开同一画布后，表单和 iframe 都保持该值。随后从同一画布路径恢复原文，最终认证回读为 `效能提升50%，丝损降低30%`，记录保持 `draft/unpublished`。
- 修复 901-1279px 中等桌面宽度：工作台导航在该区间改回网格流内，不再以固定层覆盖画布工具条。真实浏览器在 `1024x900` 中修改、保存、恢复都可点击；`1440x900` 的三栏画布布局仍正常。
- 本轮 TDD：先新增联系人旧字段回退和中等桌面布局保护测试；定向测试 `31/31` 通过，扩展已重新构建并重启 Directus。

## 本轮运行验证：首页三大特点短标题补全与保存闭环

- 2026-08-27：认证读取发现 `pages/1.sections[advanced-manufacturing]` 只保存了 `title/body`，而官网可见的“先进智造”标签、首屏标题和说明来自静态默认值。因此标签虽可见，却没有稳定的可保存字段路径，不能算可视化编辑完成。
- 按 TDD 新增失败测试后，工作台只为首页三大特点的**缺失属性**补齐 `kicker`、`shortTitle`、`introTitle`、`introDetail` 和 `mode`；已有值以及用户主动保存的空字符串不覆盖。该补齐只作用于工作台草稿与实时预览，保存草稿后才写入 `pages/1.sections`，不会改动 Nuxt 模板或普通官网布局。
- 真实浏览器从 `网站主页 -> 三大特点` 进入 PC 画布，点击横移标签“先进智造”，属性栏准确显示 `pages · shortTitle`。临时修改为 `先进智造-TDD` 后 iframe 标签立即同步；保存后认证 Directus 回读为临时值，点击“重新加载”后属性栏与画布仍保持该值；再用同一路径恢复“先进智造”，最终认证回读确认 `shortTitle=先进智造`，页面仍为 `draft/unpublished`。
- 2026-08-27：同一真实 PC 画布点击“领军品牌”横移标签，属性栏命中 `pages · shortTitle`。临时修改为 `领军品牌-TDD` 后 iframe 立即同步；保存、认证回读与工作台完整重载均保持临时值；随后恢复“领军品牌”，最终认证回读确认恢复值，页面保持 `draft/unpublished`。
- 2026-08-27：画布子页面回传选中事件新增受限来源回退：当 Chromium 未提供 `ancestorOrigins` 时，仅在 `document.referrer` 的来源位于 CMS 允许列表内才作为 `postMessage` 目标；否则仍退回允许列表首项。该项已由单元测试覆盖，尚不作为 `product_models.model_code` 的真实浏览器闭环证据。
- 2026-08-27：通过管理员认证接口对 `product_models/15 (FL1180)` 的 `configuration.intro.title` 执行临时草稿写入，受保护回读匹配测试值；同一脚本恢复完整原配置，最终回读确认原值和 `draft/unpublished` 均未改变。该证据确认嵌套字段的保存与恢复链路，不替代画布选中和即时预览的浏览器验收。

## 本轮运行验证：首页三大特点首屏标题与说明

- 2026-08-27：真实 PC 工作台从“网站主页 -> 三大特点”打开 Nuxt iframe，点击首屏列表中的“先进智造”标题，属性栏显示 `pages · introTitle`。此前预览桥未把 `<b>` 纳入可选文字元素，已按 TDD 补齐；临时值 `先进智造 首屏-TDD` 立即在 iframe 更新，保存后认证 Directus 回读 `pages/1.sections[advanced-manufacturing].introTitle` 为临时值，工作台重新加载后表单和画布仍一致，随后恢复为 `先进智造` 并完成最终认证回读。
- 2026-08-27：同一画布点击“30年技术沉淀，先进制造工厂”说明，属性栏显示 `pages · introDetail`。临时值 `30年技术沉淀，先进制造工厂-TDD` 即时显示、保存后认证 Directus 回读和完整重新加载均保持；随后恢复原文并完成最终认证回读。两项验证期间记录始终为 `draft/unpublished`。
- 2026-08-27：点击横移图文内的同名大标题，属性栏独立命中 `pages · title`，而非 `introDetail`。临时值 `30年技术沉淀，先进制造工厂 标题-TDD` 在该横移画面即时更新；保存、认证 Directus 回读、重新加载和恢复原文均完成。由此确认首屏标题、首屏说明与横移标题存在三个独立且不串写的字段路径。

## 本轮运行验证：首页三大理由总标题

- 2026-08-27：在真实 Nuxt PC 画布点击“选择瑞钧的三大理由”，属性栏准确显示 `pages · title`，目标为 `pages/1.sections[why-ruijun].title`。临时值 `选择瑞钧的三大理由-TDD` 在 iframe 即时更新；保存后认证 Directus 回读为临时值，重新加载工作台与画布仍一致，随后恢复原文并完成最终认证回读，页面保持 `draft/unpublished`。
- 2026-08-31：总标题、三条首屏理由的 `introTitle/introDetail`、横移导航 `shortTitle`、设备场景 `body` 和图片场景 `title` 均已接入各自的受控 `field_presentation` 路径，默认关闭时不改变 PSD 原布局和横移动画。`cms/scripts/verify-homepage-reason-intro-title-presentation-preview.mjs` 已验证 `performance.introTitle` 的位置/字号/行高/颜色从 Directus 到 Nuxt 预览实际生效，并确认相邻 `advanced-manufacturing` 未串写、最后自动恢复；2026-09-01 已补齐工作台属性面板的真实 PC 保存、重载和恢复验收。
- 2026-09-01：补充首页“先进智造”字段的真实 PC 画布来源标识验收。工作台从“网站主页 -> 三大特点”打开实时预览，点击 iframe 内“先进智造”，右侧属性面板显示 `pages/1 · sections[advanced-manufacturing].introTitle`，截图：`output/playwright/home-advanced-manufacturing-record-source-20260901.png`。本项只强化页面记录与区块路径的可追踪性，不改变 Nuxt 布局或发布状态。

## 本轮修复：未渲染字段不得伪装为可视化编辑

- 2026-08-27：核查 `website/pages/index.vue` 后确认 `pages/1.sections[why-ruijun].body` 未被 Nuxt 首页模板读取，因此此前 CMS 中的“正文”输入会产生无法在官网或画布中看到的保存结果。
- 按 TDD 新增失败测试后，工作台对该唯一未渲染字段隐藏可写正文输入，改为只读说明“此区块当前官网没有正文展示位”。其它首页区块的正文输入不受影响。扩展重建并重启 Directus 后，在真实工作台已复验该提示和其它理由正文输入同时正确显示。

## 本轮运行验证：首页视频正文画布点击修复

- 2026-08-27：`pages/1.sections[hero].body` 在 iframe 中已有完整的 `pages · body` 绑定元数据，但 `.hero-cms-copy` 的 `pointer-events:none` 让正文永远无法接收画布点击。根因是展示层的事件穿透规则也作用于 CMS 编辑态，而不是绑定或保存目标错误。
- 按 TDD 先新增失败测试，再在 `website/pages/index.vue` 增加非 scoped 的编辑态限定规则：仅 `html[data-cms-preview-edit-mode="true"]` 下正文绑定元素恢复 `pointer-events:auto;cursor:text`；普通官网仍保留原始事件穿透和链接行为。
- 真实浏览器在 `网站主页 -> 首页视频` 点击首屏正文后，属性栏显示 `pages · body`。将正文临时改为 `首页视频说明-点击修复-TDD` 后，iframe 立即更新；保存请求 `PATCH /items/pages/1` 返回 `200`，认证响应中 `sections[hero].body` 为临时值；点击“重新加载”后表单、画布与属性栏一致。随后恢复为原始空字符串并再次保存，最终认证响应确认 `sections[hero].body=""`，工作台重载后临时值不存在，页面保持 `draft/unpublished`。

## 本轮运行验证：首页产品区标题

- 2026-08-27：在 `网站主页 -> 产品系列展示图` 的真实 Nuxt PC 画布点击“我们的产品”，属性栏显示 `pages · title`，目标为 `pages/1.sections[products].title`。
- 临时改为 `我们的产品-TDD` 后，iframe 的产品区标题立即更新；保存请求 `PATCH /items/pages/1` 返回 `200`，认证响应回读 `sections[products].title` 为临时值。点击“重新加载”后表单、画布和属性栏一致。
- 随后按相同路径恢复“我们的产品”并保存；最终认证回读为 `products_title="我们的产品"`、`hero_body=""`、页面仍为 `draft/unpublished`，工作台重载后临时值不存在。

## 本轮修复与运行验证：首页时间轴标题

- 2026-08-27：时间轴区块的 static 背景被标记为 `media-pending`。预览桥原先先向上查找只读祖先，导致点击内部已绑定的中文标题时发送“静态媒体只读”而不是文字编辑请求；该问题会影响所有“静态背景 + 可编辑文字”的区块。
- 按 TDD 新增失败测试后，`readonlyVisualTarget()` 先识别点击源是否处于有效的 `data-cms-preview-editable="true"` 文字元素内；只有没有可写子元素时才执行静态媒体只读逻辑。直接点击静态背景仍保持原提示，正常官网和模板布局均未修改。
- 真实浏览器在 `网站主页 -> 时间轴` 点击“瑞钧智科的中走丝制造历史”后，消息和属性栏均准确显示 `pages · history · title`。临时改为 `瑞钧智科制造历程-TDD` 后 iframe 即时更新；保存请求 `PATCH /items/pages/1` 返回 `200`，认证回读为临时值，工作台重载后一致。随后恢复原文并再次保存，最终认证回读为原值、临时值不存在，页面保持 `draft/unpublished`。
- 2026-08-29：修复首页预览令牌未携带 `milestones`，导致画布点击 `2003` 错绑到 `pages · year` 且值为空的问题。令牌现在会受控携带同页里程碑，首页预览优先消费令牌记录。真实 PC 画布重新连接后点击 `2003`，属性栏准确显示 `milestones · year` 和初始值 `2003`；临时改为 `2004` 会即时更新 iframe，保存并“重新加载”仍回读为 `2004`，随后已恢复 `2003` 并保存。此项仅验证年份字段，不代表时间轴背景或图标已具备受治理的媒体替换能力。

## 本轮运行验证：静态媒体只读

- 2026-08-27：在 `网站主页 -> 时间轴` 打开真实 Nuxt PC 画布并进入编辑模式，真实鼠标点击时间轴静态背景后，工作台显示“请先在媒体资产中导入、审核并发布后再替换”。属性栏没有文字、媒体、位置或样式写入控件。
- 该验证仅证明未托管 static/PSD 媒体不会被误导为可替换，不是媒体上传、MinIO 存储、页面替换或发布的闭环证据。
- 定向测试：`cms/test/visual-editing-target.test.mjs`、`cms/test/workbench-chinese-ui.test.mjs`、`website/test/cms-live-preview.test.mjs`；本轮全量测试：CMS `271/271`、website `267/267`；Nuxt 生产构建通过。

## 本轮运行验证：产品型号编码与中等桌面预览布局

- 2026-08-29：在 `1280px` PC 工作台打开“产品展示 -> 高级设置 -> 型号与参数 -> FL1180”实时预览时，旧布局会让预览 iframe 覆盖“保存型号信息”按钮，真实点击被浏览器以 `iframe intercepts pointer events` 拒绝。按失败测试将该预览宽度下的型号列表和表单改为纵向排列；公开 Nuxt 页面、路由和画面布局均未修改。
- 重启 Directus 后，真实浏览器再次进入同一路径，`product_models/15.model_code` 从 `fl1180` 临时改为 `fl1180-tdd`，画布内型号导航立即同步；“保存型号信息”可点击，工作台“重新加载”后仍读取临时值。随后恢复 `fl1180` 并保存、重载，确认 `fl1180-tdd` 不存在。此次闭环未涉及其它型号、产品图片或尺寸图。
- 2026-08-31：真实 PC 工作台进入“产品展示 -> 产品型号、参数与尺寸图 -> FL1610”，在 Nuxt iframe 直接选中型号导航 `fl1610`，右侧属性栏精确显示 `product_models · model_code`。临时改为 `fl1610-画布验收` 后，型号表单、iframe 和属性栏立即同步；保存后认证 Directus 回读 `product_models/17.model_code` 为临时值，且相邻 `15/16` 仍为 `fl1180/fl1390`。点击“重新加载”后，列表、表单、画布和属性栏均保持临时值；随后通过同一属性栏恢复 `fl1610`、保存并重载，最终认证回读确认三条型号编码均为原值。`cms/scripts/verify-product-model-third-record-preview.mjs` 已验证该产品记录的预览目标与字段级约束。本项仅覆盖型号编码文字，不代表产品图片、工程图或全部参数均已验收。
- 2026-08-31：真实 PC 工作台进入“产品展示 -> 产品型号、参数与尺寸图 -> FR400XS (Auto)”，在 Nuxt iframe 点击可见说明“多组传感器和伺服驱动技术，实时感知并动态调整钼丝张力”，右侧属性栏精确显示 `product_models · configuration.features.1.detail`。临时改为 `伺服张力控制说明-画布验收` 后，特点 2 表单、iframe 和属性栏立即同步；保存后认证 Directus 回读只更新 `product_models/1.configuration.features[1].detail`，对照 `product_models/2` 保持原文。完整工作台重载后三处仍显示临时值；随后从同一属性栏恢复原说明、保存并重载，最终认证回读确认两条记录均为原值。`cms/scripts/verify-product-model-auto-detail-preview.mjs` 作为字段级回归门槛通过。该项只覆盖第二条特点说明文字，不代表特点图片、其它说明或产品媒体已经完成。

## 本轮运行验证：防串写与 PC 三栏布局

- 2026-08-27：真实工作台中，切换网站页面、一级区块或内容模块会清空旧画布选择和旧媒体选择；不可解析的 iframe 编辑请求在创建可写选择前即返回。随后选中产品系列或 `FL1180` 参数时，属性栏只显示当前集合、记录与字段路径。预览打开后默认进入“编辑中”，点击新闻标题会停留在新闻页并选中 `articles · title`，不会误导航到失效详情页。
- 2026-08-27：在 `1440x900`、`1920x1080`、`3840x2160` 实测外层 `scrollWidth=clientWidth`；预览、表单与属性栏同时可见。`1440x900` 表单切为单列，避免预览覆盖输入区。
- 定向测试新增：桌面 `1440px` 预览可用、不可解析画布请求不能沿用旧写入目标、切换站点区块清空旧选择。当前全量测试为 CMS `271/271`、website `267/267`。

## 本轮运行验证：视频新闻文章标题闭环与详情日期

- 2026-08-27：真实工作台进入 `视频新闻 -> 动态新闻内容`，画布点击 `articles/10` 的文章标题，右侧属性栏显示 `articles · title`。输入临时标题后 iframe 立即显示，保存提示“内容草稿已保存，并已进入内容版本审计”；认证请求 `/items/articles/10?fields=id,title,display_date,status,publication_state` 返回临时标题和 `draft/unpublished`。
- 点击“重新加载”后工作台仍读取临时标题；再次输入并保存“未命名文章”，最终认证回读为原值，未留下测试数据。
- 新闻详情页日期改用 `formatNewsDisplayDate`，与列表页保持同一时区和非法日期兜底规则；视频媒体回退列表也复用 `sortNewsByDisplayDate`。Nuxt 全量测试当前为 `267/267`，CMS 全量测试为 `271/271`。
- `npm run media:verify-e2e` 通过，证明临时上传、文件元数据校验、`media_assets` 治理和 MinIO 链路可运行；该次验证清理测试记录后当时 `media_assets=0`，因此不能计为正式媒体替换闭环。后续已导入 23 条产品尺寸图候选，当前仍均为待版权确认的草稿，见本表后续媒体导入记录。

## 本轮运行验证：新闻同日排序与启动恢复

- 2026-08-27：新增 `articles.sort_order`（非负整数）。规则为业务日期降序、同日 `sort_order` 升序、仍相同则记录 ID 降序；Directus schema 已实际应用并认证读取到字段类型 `integer`。Nuxt 视频媒体接口的回退列表现已复用同一排序器，不再使用仅日期差值的旧排序。
- 真实工作台 `视频新闻 -> 动态新闻内容` 显示“同日排序”字段。对 `articles/10` 临时保存 `7` 后，认证 Directus 回读和工作台“重新加载”均保持 `7`；随后恢复原始数据库值 `null` 并完成最终认证回读。iframe 处于“实时同步”状态，Nuxt `4175/news` 返回 `200` 且可在 Directus 内嵌。
- 两条临时同日记录用于验证发布边界时被内容工作流强制降为 `draft/unpublished`，未出现在公开新闻页；两条记录已清理。因此正式的“审核后发布列表顺序”仍需与 P2 发布流联测，不能把直接写入或草稿显示当作公开排序验收。
- 修复 `website/scripts/restart-local-website.ps1`：Nuxt CLI 升级后旧的内部入口不再启动监听，现改用官方 `nuxi.mjs dev`。修复后脚本返回健康状态，`/news` 返回 `200`。
- 2026-08-27：清理已确认的 6 个测试文件记录（`probe/e2e/spoofed` 命名），并核对无任何正式集合引用；当前认证回读为 `media_assets=0`、`directus_files=0`，MinIO 业务桶无对象。正式媒体替换闭环仍待业务素材。

## 本轮运行验证：文章同日排序空值保持

- 2026-08-27：为 `articles.sort_order` 先加入失败测试，再在工作台增加可选整数归一化。数据库值为 `null` 时表单保持为空，合法 `0` 保留为 `0`，非法非空值继续阻止保存；保存 payload 明确发送 `sort_order: null`，不会把未设置值静默改成 `0`。
- 重建扩展并重启 Directus 后，真实浏览器进入“视频新闻 -> 动态新闻内容”，文章 `10` 的“同日排序”显示为空；点击保存后认证请求回读 `sort_order: null`，状态仍为 `draft/unpublished`。
- 本轮回归：CMS `273/273`，website `267/267`；工作台扩展 `npm run build` 成功；Directus `8055`、Nuxt `4175/news`、MinIO `9000/9001` 健康检查均为 `200`。
- 同轮 E2E：`media:verify-e2e`、`publication:verify-e2e`、`versioning:verify-e2e` 全部通过；发布 E2E 和版本恢复 E2E 的临时记录均已自动清理。工作台账号直接聚合读取 `directus_files` 返回 `403` 属于预期权限边界，不影响受控媒体治理链路。

## 网站主页：`pages/1`，`website/pages/index.vue`

| 区块键 | 可见内容与字段路径 | 数据目标 | 当前状态 |
| --- | --- | --- |
| `hero` | `body`、`label`、`href` | `pages/1.sections[hero]` | `body` **已闭环，2026-08-27**；`label`、`href` **已闭环，2026-08-28**：默认可见 CTA“了解更多”也有真实画布绑定，右侧可同时编辑文案与安全链接；均已完成画布选中、即时预览、保存、认证回读、工作台重载与原值恢复。首屏视频、海报/背景当前来自独立媒体接口或 static fallback，`media_assets=0` 时只读/待媒体 |
| `why-ruijun` | 总标题 | `pages/1.sections[why-ruijun].title` | `title` **已闭环，2026-08-27**：真实画布选中、即时预览、保存、认证回读、完整刷新与原值恢复均已完成；`body` 不在当前 Nuxt 模板中渲染，工作台已明确设为不可视化编辑，不能计入可编辑内容。首屏机器图为 static fallback，只读/待媒体 |
| `performance`、`advanced-manufacturing`、`industry-leadership` | 三大特点及横移图文的标题、正文、短标题 | `pages/1.sections[{id}]` | `performance.body`、`advanced-manufacturing.shortTitle`、`industry-leadership.shortTitle`、`advanced-manufacturing.title`、`advanced-manufacturing.introTitle`、`advanced-manufacturing.introDetail` **均已闭环，2026-08-27**：缺失字段已以受控草稿默认值补齐；每项均完成画布选中、即时预览、保存、认证回读、完整刷新与原值恢复。页面模板把三项复用于横移图文；当前三条源记录均带 `requires_claim_review=true`，其它宣传性文字在业务审核清除该标记前不得绕过公开端拦截或伪记为可编辑闭环。图片和小图标无受治理媒体记录，均只读/待媒体 |
| `products` | 区块 `kicker/title` | `pages/1.sections[products].kicker/title` | `title` **已闭环，2026-08-27**；`kicker` **已闭环，2026-08-28**：初始字段为空时仍可选中画布默认 “Our product”，临时值即时更新、保存后认证回读、完整重载与原值恢复均通过。首页产品卡在公开/预览端无已发布产品记录时退回 static fallback，卡片图片、名称和系列不能据此判定可写入 |
| `history` | 中文标题、英文标题 `kicker`、提示语 `label`；里程碑年份/事件/佐证 | `pages/1.sections[history].title/kicker/label`；`milestones/{id}.year/event/evidence` | `title` **已闭环，2026-08-27**；`kicker`、`label` **已闭环，2026-08-28**：两字段原始草稿值均为空，官网分别保留既有英文标题和 “SCROLL TO EXPLORE” 显示 fallback；填写后画布即时更新，保存草稿、认证 Directus 回读、完整工作台重载与恢复空值均通过。`milestones/1.event` 已闭环样本。`milestones/3.event` **已闭环，2026-08-31**：先以 `cms/scripts/verify-milestone-third-event-shared-preview.mjs` 确认同一草稿记录同时渲染于首页和关于页授权预览且 1、2 号里程碑不变；再在真实 PC 工作台“关于瑞钧 -> 发展历程里程碑”切换到 2006 条目并从 iframe 点击事件文字，属性栏准确显示 `milestones · event`。临时值即时同步，保存后认证 Directus 回读、完整工作台重载和同一属性面板恢复原文均通过。背景和滚轮图标无受治理媒体，当前真实画布会明确只读并提示先导入、审核、发布；不能替换或计为媒体闭环 |
| `product-task` | 标题、正文、按钮文案/链接；标题、正文、按钮独立位置/样式 | `pages/1.sections[product-task].title/body/label/href`；`field_presentation.title/body/label` | **文字已闭环**：2026-08-26 已完成入口、画布选中、即时预览、保存、认证回读、整页刷新和原值恢复。**标题独立位置/样式已闭环，2026-08-28**：真实 PC 画布将标题临时设为横向偏移 `6%`、字号 `48px`；保存后认证回读仅有 `field_presentation.title`，`body` 未生成同类设置；完整重载并重选标题仍为 `6/48`，最后恢复验收前段落数据。**正文独立位置/样式已闭环，2026-08-29**：真实 PC 画布点击正文准确命中 `pages · body`；临时设为横向偏移 `6%`、字号 `18px` 后 iframe 计算样式为 `translate: 6% 0%`、`font-size: 18px`。保存后认证 Directus 回读为 `field_presentation.body`，完整工作台重载并再次打开预览仍保持，最后删除临时 `body` 样式并回读确认恢复 `null`。**按钮独立位置/样式已闭环，2026-08-29**：真实 PC 画布点击“获取选型建议”准确命中 `pages · label`；临时设为横向偏移 `4%`、字号 `16px` 后，iframe 计算样式为 `translate: 4% 0%`、`font-size: 16px`。保存后认证 Directus 回读为 `field_presentation.label`，完整工作台重载仍保持；随后已删除临时 `label` 样式并回读确认恢复为空。未托管背景如需替换仍待媒体治理 |
| 页尾 | 栏目、链接、联系文字、采购区文字 | `site_settings.footer`、`site_settings.contacts` | **已闭环（文字）**：2026-08-27 画布选中 `site_settings · footer.columns.0.title`、即时预览、局部保存、认证回读、工作台刷新和原值恢复均已完成。Logo 与三个小图标仍为媒体待治理，不能计入媒体替换闭环 |

## 产品展示：`pages/7`，`website/pages/product/[slug].vue`

| 区块键 | 可见内容与字段路径 | 数据目标 | 当前状态 |
| --- | --- | --- |
| `hero`、`categories`、三项指标 | `title`、`kicker`、`body`、`value`、`unit` | `pages/7.sections[...]` | `hero.title`、`hero.kicker`、`categories.title`、`categories.kicker`、`proof-efficiency.body`、`proof-years.body`、`proof-champion.body` **已闭环**：首屏标题与副标题现有独立直接画布绑定，真实 PC 画布点击分别准确命中 `pages · title`、`pages · kicker`；“选择瑞钧理由”命中 `categories.title`，三项指标说明分别命中各自的 `body`。其中 `categories.kicker` 于 2026-08-28 按失败浏览器验收发现 fallback 漏声明，补齐既有“3大”字段契约后完成选中、即时预览、保存、认证 Directus 回读、独立重开工作台与恢复空值；恢复后官网默认“3大”正确显示。其余字段按各自记录完成回读与原值恢复，分类标题未串写首屏标题；未列字段仍为已声明待闭环 |
| `model-list` | 系列 `name`、`positioning`、`cover_asset` | `product_series/{id}` | `product_series/1.name`、`product_series/1.positioning` 已闭环样本；`product_series/2.positioning` 于 2026-08-28 也完成跨记录闭环：真实画布点击第二张“自动穿丝系列”精确切到 `product_series · positioning`，临时值即时显示，保存后认证回读明确为 `id=2`，完整工作台重载和重选后仍一致，最终恢复原文。区块 `title` 在当前 Nuxt 模板中仅为 `sr-only` 无障碍标题，2026-08-27 已按 TDD 在工作台明确标为“官网没有标题展示位”，不再作为可视化可编辑项或完成证据；`cover_asset` 已于 2026-08-27 验证媒体模式可准确选中 `product_series · cover_asset`，在 `media_assets=0` 时显示“待媒体”而不展示空替换控件。它仍待正式受治理媒体，尚未达到上传、替换、保存与回读的媒体闭环 |
| `parameters` | 型号 `model_code`、配置中的介绍/能力/机床图 | `product_models/{id}` | `product_models/15.model_code` **已闭环，2026-08-29**：真实 PC 画布点击 `fl1180` 精确选中跨集合 `product_models · model_code`；临时值即时进入 iframe，保存后工作台重载仍读取该值，随后保存恢复 `fl1180` 并重载确认测试值不存在。`product_models/15.configuration.features.0.label` **已闭环，2026-08-29**：画布选择“`五轴数控`”准确命中嵌套字段，临时值即时显示、保存后完整工作台重载保持，最终恢复原文并确认测试文字不存在。`product_models/16.configuration.features.0.label` **已完成跨记录闭环，2026-08-29**：切换至 `FL1390` 后画布仍精确选择同一嵌套路径；临时值仅显示并保存到 16 号记录，重载后保持，切回 15 号记录确认未串写，最终恢复原文。`product_models/17.configuration.features.0.label` **已完成自动化 API/预览闭环，2026-08-31**：`cms/scripts/verify-product-model-third-record-preview.mjs` 临时写入 `FL1610` 首项能力标题，认证 Directus 回读后签发以 `product_models/17` 为主记录的草稿预览令牌；Nuxt `/product/fl1610?cmsPreview=1` 实际渲染该标记与精确字段路径，且同次验证确认 15、16 号型号均未改变，最后恢复 17 号记录的完整 `configuration`。最新结果：`savedTo=product_models/17.configuration.features.0.label`、`previewTarget=product_models/17/product-details`、`restored=true`。管理员实际画布选择、属性面板保存、完整重载与恢复仍需人工浏览器验收。**同字段样式闭环，2026-08-29**：从实际属性面板设为行高 `1.6`、颜色 `#123456` 后，iframe 计算样式为 `32px` 与 `rgb(18, 52, 86)`；点击“保存型号信息”后认证 Directus 回读仅在 `configuration.field_presentation.features_0_label.text_style` 写入白名单字段。完整工作台重载并重新选中同一画布节点仍保持样式；最后删除临时字段级样式并重载确认恢复默认 `27px`、`rgb(7, 1, 146)`。`product_models/16.configuration.features.0.detail` **已闭环，2026-08-29**：该字段起初为空，先通过型号表单写入临时说明，使真实 Nuxt 画布出现可选文本；画布选中后准确命中嵌套 `detail`，属性栏修改、保存及重载均保持，最终恢复空值并确认测试文字不存在。`product_models/15.configuration.intro.title` 仅完成认证写入、回读与恢复，**不是可视化闭环**：15 号型号属于 `fl-xs`，页面只在工作站系列渲染介绍区域，当前字段为空且不在 PC 画布中出现。`product_parameters/94.value` 与 `product_parameters/94.field_name` 的独立参数闭环均有效；其它型号字段、介绍、能力和机床图待闭环。 |
| `dimensions` | 参数 `field_name`、`value`、单位；尺寸图 | `product_parameters/{id}`、型号配置 | `product_parameters/94.value`、`product_parameters/94.field_name`、`product_parameters/94.unit` **均已闭环，2026-08-28**：画布选中、即时预览、保存、认证 Directus 回读、整页刷新与原值恢复均已完成。单位仍在原参数单元格内连续显示，不改变产品页几何；参数名称实时预览保持跨集合目标，不会退回型号快照；静态尺寸图仍只读 |
| `pagination`、资料/案例 | 分页文案、资料标题、案例标题/摘要 | 页面区块、产品关联记录 | `pages/7.sections[pagination].pagination.next_label`、`previous_label` **均已闭环，2026-08-28**：先以失败测试确认嵌套分页配置未穿透 `resolvePageSection()`，修复后真实 PC 画布可精确命中 `pages · pagination.next_label`；在受控每页 3 条的有效分页条件下，前后页文案均完成即时更新、保存后认证 Directus 回读、完整工作台重载与原值恢复，最终还原 `page_size=6`、“上一页”和“下一页”。首屏的“上一页”保持原生禁用；编辑模式仅将其鼠标命中交给父容器，再由受控坐标解析选回按钮，因此不改变公开端禁用行为。**2026-08-29**：`resources.kicker` 与 `cases.kicker` 的真实可见 DOM 已补齐精确字段绑定；先以失败测试确认缺失，补齐后官网定向测试通过。当前没有实际资料/案例记录，区块不会渲染，故尚未计入浏览器保存闭环。 |

### 本轮：型号代码样式与位置

- 2026-08-31：`product_models/17.configuration.labels.technical_image_asset_id`（FL1610 技术参数侧边图）已完成真实 PC 工作台的内部草稿可逆保存闭环。画布点击图片准确命中该字段，媒体候选只显示 23 条 `product.gallery.image` 尺寸图草稿；选择 `1610.png` 后 iframe 立即替换为 Directus 资源，保存请求返回 `200`，完整重载后表单明确显示该草稿，证明不是浏览器暂存。最后恢复“沿用官网原图”并保存，最终请求体为 `technical_image_asset_id: null`，刷新后的下拉框仍保持该选择。该能力仅限已登录内部预览；素材仍是 `pending_review + draft + unpublished`，不能发布到官网。

- 2026-08-31：尺寸图选择器现在使用已登记素材标题而非仅文件名，并按当前型号的明确标题匹配优先排序。实际切换 FL1610 后，“FL1610 尺寸参数图 · 1610.png · image/png（仅内部预览草稿）”为首个候选；其它 22 个候选保留且可见。纯函数测试覆盖匹配优先、同名文件可区分和禁止部分文件名猜测，均通过；本项不更改任何型号关联、公开页面或素材状态。

- 2026-08-31：`product_models/17.configuration.features.0.label`（FL1610 的“\`五轴数控\`”）已补齐真实 PC 画布闭环。工作台从“产品展示 -> 产品型号、参数与尺寸图”选择 FL1610 并打开实时预览；在 iframe 内直接点选带精确绑定的文字节点后，属性面板命中 `product_models · configuration.features.0.label`。临时文字立即同步到画布，保存请求 `PATCH /items/product_models/17` 返回 `200`，完整重载后表单、画布和属性面板保持测试值；随后已从同一属性面板恢复“\`五轴数控\`”并重载确认。该项只覆盖首项标题文字，不把 4 个特点的图片、空说明或工程图误计为完成。

- 2026-08-31：型号代码 `product_models/17.model_code` 的可见画布节点已新增独立 `presentation.field_presentation.model_code` 保存路径，默认配置为空时不改变原 PSD 布局。Directus 已创建该 JSON 字段并重启工作台、预览令牌扩展和 Nuxt。可逆验证同时写入 FL1610 的能力标题与型号代码样式/位置，Directus 回读、预览会话和 `/product/fl1610?cmsPreview=1` HTML 均确认 `24px` 样式和精确位置路径已渲染；15、16 号型号未变化，最后自动恢复。该项为 API/预览闭环，工作台的实际画布选中、属性面板保存、重载和恢复仍待人工浏览器验收。
- 2026-08-31 补充真实 PC 画布验收：工作台从“产品展示 -> 产品型号、参数与尺寸图”打开 `FL1610`，实时预览内点击可见型号编码 `fl1610`，属性面板准确显示 `product_models · model_code`。临时改为 `fl1610-canvas-e2e` 后，型号表单、iframe 导航和实时预览状态均即时同步；点击“保存型号信息”后完整刷新工作台，列表仍读取该测试值。随后恢复 `fl1610` 并保存，`PATCH /items/product_models/17` 返回 `200`，请求体也确认原值已写回。此验收不修改 Nuxt 页面布局，且不将型号图片或媒体替换计为完成。
- 2026-08-31：第二个自动穿丝型号详情文段 `product_models/1.configuration.features.1.detail` 已由 `cms/scripts/verify-product-model-auto-detail-preview.mjs` 完成可逆 API/预览闭环。脚本写入 `features_1_detail` 的受控样式与位置，认证 Directus 回读、预览令牌会话和 Nuxt HTML 均确认渲染；同型号首项和 `product_models/2` 的对应说明未被串写，最后恢复完整 `configuration`。此项不替代管理员在工作台的实际画布选择、保存、刷新与恢复验收。
- 2026-08-31：该文段已补充真实 PC 画布验收。工作台在 `FR400XS (Auto)` 预览中点击第二项说明，准确选中 `product_models · configuration.features.1.detail`；临时文字即时显示、保存草稿后完整重载仍保持，随后恢复原文并保存。认证 Directus 读取确认恢复后的原文已持久化。
- 2026-09-01：补充 `product_models/17.configuration.features.0.label` 的真实 PC 画布来源标识验收。工作台选择 FL1610 后点击“`五轴数控`”，右侧属性面板显示 `product_models/17 · configuration.features.0.label`，同时提供文字、位置、字号、字重、行高和颜色控件。截图：`output/playwright/product-FL1610-record-source-20260901.png`。本项只补强记录级目标可追踪性，不替代既有保存/重载闭环，也不代表该型号其它文字、图片或工程图已完成。
- 2026-09-01：`product_models/17.configuration.features.1.label`（FL1610“`四轴螺距补偿`”）完成真实 PC 画布保存、重载和恢复闭环。临时修改为“`四轴螺距补偿-画布验收`”后即时进入 iframe，点击“保存型号信息”显示保存成功；工作台重载仍保持测试值，随后恢复原文并再次保存，认证状态与相邻能力项均保持不变。本项仅覆盖第二项能力标题文字。
- 2026-08-31：该节点的字段级位置与文字样式也完成真实 PC 画布闭环。临时保存 `3% / 18px / 600 / 1.5 / #123456` 后，iframe 计算样式、Directus 回读和完整重载均一致；最后删除临时 `features_1_detail` presentation，画布恢复 `11px / 400 / 1.6 / #4f5357 / 无偏移`。

### 本轮闭环：三大指标数字实时预览

- 2026-08-29：产品页 `pages/7.sections[proof-efficiency].value/unit` 与 `proof-years.value/unit` 原先仅在工作台内存中补齐，未实际存入 Directus；已用幂等回填将 `50 / % / 30 / YEARS` 写入产品草稿，且不会覆盖已有非空用户值。
- 真实 Chrome 验收从“产品展示 -> 三大指标”进入 PC 画布，选中 `proof-efficiency.value` 后属性面板显示 `pages · value`。临时编辑为 `51` 会立即在 iframe 显示；保存后认证 Directus 回读一致，点击“重新加载”后仍读取 `51`，最后自动恢复 `50` 并复核。记录始终为 `draft/unpublished`，未公开发布。
- 本轮先后修复两条实际链路：预览解析器遗漏数值字段，以及跨窗口预览安全白名单遗漏 `value/unit`。公开站仍遵循 `requires_claim_review` 的审核拦截；仅已登录的 CMS 预览画布显示待审核草稿。截图：`output/playwright/product-proof-visual-editing.png`。
- 2026-08-29 补充闭环：`proof-years.value`、`proof-years.unit` 与 `proof-champion.title` 均完成真实 PC 画布验收。三项分别以临时值保存，认证 Directus 回读后点击“重新加载”仍与画布一致，最后自动恢复原值。验收中发现 `value` 会被属性面板以字符串写入，现按失败测试修复为保持原有数值字段类型并拒绝空值/非法数值；同时编辑会话在重载时会立即显示数值、停止公开端增长动画，避免动画帧覆盖已保存值。截图：`output/playwright/product-proof-years-value-visual-editing.png`、`output/playwright/product-proof-years-unit-visual-editing.png`、`output/playwright/product-proof-champion-title-visual-editing.png`。
- `proof-efficiency.unit` 于同日完成独立闭环：画布点击 `%` 准确选中 `pages · unit`；临时输入、即时预览、保存、认证回读、完整重载和原值恢复均通过。至此，三大指标的可见数值/单位、第三项标题与三项说明都已有字段级证据；待审核属性未被公开端绕过。

2026-09-01：`product_models/17.configuration.drawings.0.media_asset_id` 完成内部草稿媒体的真实 PC 可逆闭环。先运行既有受保护 API/预览验证，确认 `media_assets/27`（FL1610 尺寸参数图）保持 `draft/unpublished`，能被预览会话读取且脚本自动恢复。随后在工作台“产品展示 -> 产品型号、参数与尺寸图”选中 FL1610，新增尺寸图并选择该候选图；iframe 即时显示“FL1610 内部预览工程图”。画布点击图片后属性面板精确命中 `product_models · configuration.drawings.0.media_asset_id`，并显示内部预览候选的媒体替换下拉；从画布保存后认证 Directus 回读 `media_asset_id=27`，工作台完整重载、重新打开预览并再次点击图片仍命中同一路径。最后删除测试尺寸图、保存并认证回读 `drawing=null`，画布恢复原始工程视图。截图：`output/playwright/product-FL1610-draft-drawing-reload-20260901.png`。该项仅证明内部草稿预览和草稿保存，不是正式素材发布或公开替换证据。

## 先进制造：`pages/8`，`website/pages/manufacturing.vue`

### 本轮修复：制造页可见文字与 CMS 字段一致

- 2026-08-27：认证读取确认 `pages/8.sections[precision-machining].description` 等字段为空时，Nuxt 会显示静态 PSD 回退文字，造成“官网看得到、工作台字段为空”的双数据源问题。该状态不能算可视化编辑完成。
- 已将当前画布可见的首屏工艺标题、产能说明、CNC/钣金的说明与详情、装配/检测/电气说明受控回填到同一 `pages/8.sections` 草稿记录；首屏文字使用独立 `processTitle` 与 `outputText`，没有复用移动端的 `hero.title/body`。每个回填区块带 `visible_copy_materialized=true`，后续用户主动清空不会被回填脚本覆盖。
- 认证回读确认字段已写入且页面仍为 `draft/unpublished`；Nuxt `GET /manufacturing?cmsPreview=1` 返回 `200` 并包含首屏、CNC 说明和详情文本。新增回填幂等、字段路径和公开白名单测试；这证明文字来源已一致，尚不替代该字段的人工画布点击、保存、重载、恢复闭环。
- 2026-08-27：真实 Chrome 工作台验收发现桌面画布此前被旧 CSS 规则压为 `816px`，先进制造页误进入移动端 DOM，导致 PC 文字节点不可选。按失败测试修复为保留所选 `1440px` 画布逻辑宽度并使用外层滚动；不改变 Nuxt 页面布局。修复后真实 iframe 宽度为 `1440px`。
- **`pages/8.sections[precision-machining].description` 已闭环，2026-08-27**：从“先进制造 -> CNC车间”打开实时画布，点击 CNC 说明，属性栏显示 `pages · description` 且初值与画布一致。临时追加 `Visual Editing TDD` 后画布即时同步；保存草稿后认证 Directus 回读匹配，工作台完整重载并重新选择仍保持；随后通过同一路径恢复原文，最终认证回读确认恢复，状态始终为 `draft/unpublished`。

| 区块键 | 可见内容与字段路径 | 数据目标 | 当前状态 |
| --- | --- | --- |
| `hero` | 背景、移动端标题/说明、工艺标题 `processTitle`、产能说明 `outputText` | `pages/8.sections[hero]` | **`processTitle`、`outputText` 已闭环，2026-08-28**：真实 PC 画布均可准确选中并显示 `pages` 对应字段；临时值立即反映到 iframe，保存后经认证 Directus API 回读，完整工作台重载后仍一致，最终均恢复原文。制造页派生区块此前遗漏这两个受控字段，已先以失败测试复现后纳入最小白名单；未扩大为任意字段透传。背景与其它媒体待正式素材 |
| `process` | 工艺画布背景、步骤图文、连接标签 | `pages/8.sections[process]` | **首个真实节点文本已闭环，2026-08-28**：从“先进制造 -> 工艺流程画布”新增节点，标题、正文、`connection_label` 和 `top-left` 固定锚点即时进入真实 PC iframe；保存后认证 Directus 回读、完整重载和重新进入区块均一致，最终删除节点并回读确认 `items=[]`。**节点内字段级位置/样式已接入并经真实预览验证，2026-08-31**：标题、正文和连接说明使用各自的 `items.{index}.field_presentation` 路径；临时节点标题的 `3% / 32px / 1.4 / #123456` 已由 Directus、预览会话和 Nuxt HTML 三处确认，随后删除测试节点。背景与节点媒体仍是未托管 PSD/static 素材，只读/待媒体 |
| `precision-machining` | `title`、说明、详情、图文媒体 | `pages/8.sections[precision-machining]` | **`title` 已闭环，2026-08-26**：画布点击 `CNC车间` 正确选择 `pages · title`，输入临时值后 iframe 即时更新、保存草稿可用；认证 Directus 回读、工作台重新加载和同一路径恢复原文均已验证。媒体仍只读/待媒体 |
| `sheet-metal`、`standardized-assembly`、`whole-machine-validation`、`electrical-assembly`、`smart-warehouse` | 区域标题、说明、详情、图文媒体 | `pages/8.sections[...]` | `sheet-metal.title`、`sheet-metal.description`、`sheet-metal.detail`、`standardized-assembly.title`、`standardized-assembly.description`、`whole-machine-validation.description`、`electrical-assembly.description` **已闭环，2026-08-28**：七项分别在真实 PC 画布命中真实页面字段；即时预览、保存、认证回读、完整重载及原值恢复均完成。`whole-machine-validation.title` **已完成自动化 API/预览与真实 PC 画布复验，2026-08-31**：`cms/scripts/verify-manufacturing-inspection-title-preview.mjs` 的可逆运行时验证通过；随后在工作台中实际修改标题，确认即时同步、保存草稿、认证回读、完整重载、恢复原文及再次重载，属性面板始终命中 `pages · title`。最新结果：`savedTo=pages/8.sections[whole-machine-validation].title`、`previewTarget=pages/8/whole-machine-validation`、`restored=true`。`sheet-metal.description` 还复验了防抖窗口后的 iframe 状态不会回退为临时值之前的旧文案；钣金、精密检测与电气装配的认证回读分别覆盖 `sections.3.title`、`sections.3.description`、`sections.5.description`、`sections.6.description`，不存在标题与相邻说明串写。其它文字已声明待闭环，媒体仍只读/待媒体 |
| `core-equipment` | 标题、设备媒体与排序 | 页面区块或 `manufacturing_evidence/{id}` | **`title` 已闭环，2026-08-28**：画布点击“生产核心设备”精确选择 `pages · title`；即时预览、保存草稿、认证 Directus 回读、完整工作台重载与原值恢复均已验证，状态保持 `draft/unpublished`。**内部草稿媒体闭环，2026-09-01**：`pages/8.sections[core-equipment].media -> media_assets/50`，仅匹配 `manufacturing / core-equipment / manufacturing.equipment.image` 的草稿可选；官网预览经同源、短期会话代理读取，返回 PNG 200 且禁止缓存。素材仍为 `draft/unpublished/pending_review`，不计为正式公开发布。 |

2026-08-29：`pages/8.sections[whole-machine-validation].title` 已完成独立真实 PC 画布闭环。通过“先进制造 -> 精密检测 -> 打开实时预览”进入官网画布，点击标题后属性面板精确选择 `pages · title`；临时值即时同步，保存后经认证 Directus 回读，完整工作台重载后仍一致，最后恢复“精密检测”。自动化验收同时覆盖“预览已打开则复用、未打开才启动”的重载状态，且 `finally` 强制恢复原文；记录保持 `draft/unpublished`。本项不包含检测设备图片的媒体替换。

2026-08-29：`pages/8.sections[smart-warehouse].title` 复用同一真实 PC 画布验收器完成闭环。通过“先进制造 -> 智能物料仓储”定位到实际 PSD 文本绑定，属性面板命中 `pages · title`；临时值即时同步、保存后认证回读、完整工作台重载和恢复原文均通过，记录保持 `draft/unpublished`。智能物料仓储当前官网只显示此标题，图片仍为未托管静态素材，不计入媒体替换完成。

2026-08-29：`pages/8.sections[electrical-assembly].title` 已完成独立真实 PC 画布闭环。通过“先进制造 -> 电气装配”选择官网中实际显示的标题，属性面板命中 `pages · title`；临时值即时同步、保存后认证 Directus 回读、完整工作台重载和恢复“电气装配”均通过，记录保持 `draft/unpublished`。电柜和装配展示图片仍为未托管静态素材，不计入媒体替换完成。

2026-08-31：新增可重复运行的 `cms/scripts/verify-manufacturing-process-node-preview.mjs`。该验证会临时新增一个工艺节点及节点标题的受控字段级 presentation，读取受保护 Directus 数据，签发一次性草稿预览会话，并确认 Nuxt `manufacturing?cmsPreview=1` 在 `data-cms-preview-key="process"` 区域渲染该节点、节点字段绑定、偏移与字号；最后从最新服务器快照删除测试节点并回读确认恢复。最新结果：`savedTo=pages/8.sections[process].items`、`previewTarget=pages/8/process`、`previewNodeTitle=工艺流程预览验证节点`、`restored=true`。这是 API 与真实预览链路的当前证据；仍需以已登录的人工浏览器完成“画布新增、选中、保存、刷新、删除”的操作验收。

2026-08-31：补齐其中“新增、保存、刷新、删除”的真实 PC 工作台验收。编辑者从“先进制造 -> 工艺流程画布”新建第 1 个节点，填写标题、正文、连接说明并选择 `top-left` 锚点；实时 iframe 即时显示该草稿。保存后认证 `GET /items/pages/8` 返回完整节点，工作台“重新加载”后四项表单值保持。随后通过“删除此项 -> 保存草稿”移除节点，认证回读 `hasTestNode=false`、`itemCount=0`。本项不把尚未完成的新节点画布点击/属性面板选择标作已验收。

2026-08-31：同一工艺节点已补齐真实画布选择与属性面板保存。iframe 内标题节点带 `collection=pages`、`itemId=8`、`fieldPath=items.0.title`；直接点击后右侧面板精确显示 `pages · items.0.title`。从该属性面板把标题改为“画布选中验收节点-已修改”后，iframe 立即同步；保存的认证回读匹配该标题，完整重载后节点字段仍存在，并再次由画布点击选中。最后按同一路径删除、保存与认证回读确认 `hasTestNode=false`。至此，节点的新增、画布选择、属性面板编辑、保存、重载和删除均已完成；正式媒体替换仍待治理素材。

2026-08-31：制造页压底文字此前只显示在 PSD 画布中，缺少 `collection/itemId/fieldPath`，因此不能视觉选中。现已把三个栏目的标题与链接标题、两条工厂地址、服务热线、国内/外贸邮箱和采购区文字接到关联草稿的 `site_settings` 精确字段路径；页面预览令牌已按白名单携带该关联记录，不依赖公开接口或写死 ID。新增失败测试后，网站全量测试 `355 passed, 0 failed`。服务热线和采购区两行文案各由两个原始字段组合显示，画布当前分别选择其主字段，另一个字段仍可在“高级设置 -> 全站设置”编辑；这是为了避免一次编辑错误覆盖两个数据字段。管理员实际画布点击、保存、刷新和恢复验收待执行。

2026-08-31：补齐制造页压底的跨集合真实画布闭环样本。直接点击“国内邮箱”后，属性面板精确显示 `site_settings · contacts.domestic_email`；临时邮箱即时更新画布，保存后认证 Directus 回读 `site_settings/1` 为测试值，并显式确认 `pages/8.sections[process].items` 不变。完整重载后同一节点仍显示测试邮箱且可重新选中，随后从属性面板恢复原邮箱、保存后画布恢复。该闭环证明制造页压底文本可安全写入其所属的全站设置记录；不把页尾图标、Logo 或其他字段的媒体替换计为已完成。

2026-08-31：制造页既有 PSD 文字此前错误共用区块级 presentation，编辑其中一项的偏移或字体可能影响同区块相邻文字，且画布未携带字段级保存路径。现首屏工艺/产能、CNC/钣金标题说明详情、装配、精密检测、电气装配、智能仓储与核心设备标题都改为各自的 `field_presentation.<field>`；默认配置不启用时继续使用原 PSD 坐标、字号、字重和行高。`cms/scripts/verify-manufacturing-inspection-title-preview.mjs` 现可逆验证“精密检测”标题：临时保存 `3%` 横向偏移、`40px` 字号、`1.4` 行高、`#123456` 颜色，认证 Directus 回读、受保护预览会话与 Nuxt HTML 均命中同一字段及其保存路径，最终完整恢复原文字与原 presentation。最新结果：`savedTo=pages/8.sections[whole-machine-validation].field_presentation.title`、`previewTarget=pages/8/whole-machine-validation`、`restored=true`。这证明数据与预览链路，尚不替代属性面板的人工保存/刷新验收。

2026-08-31：服务支持“国内直属办事处”的页面草稿实时预览此前丢弃嵌套 `offices`、地图角色和门店展示字段，导致官网画布虽然有 10 个地区数据，却只显示总标题。现预览净化器仅保留门店 `source_key/city/address/manager/phone` 和区域 `map/map_media_role`，不允许内部字段透传；新增回归测试覆盖该白名单与内部字段剔除。真实 PC 画布现完整显示地区和门店，点击“珠三角区”准确选中 `pages · items.2.title`，临时文字即时显示、保存后认证 Directus 回读、完整重载、恢复“珠三角区”及再次重载全部通过，状态保持 `draft/unpublished`。地区图片仍为未托管静态素材，不计入可替换媒体完成。

## 视频新闻：`pages/9`，`website/pages/news.vue`

### 2026-08-31 运行时对应关系修正

- 当前 Dynamic News 已有真实文章记录（`articles/10`），所以官网画布不会渲染区块的空状态文案“暂无动态新闻。”。工作台现将该字段明确标注为“空状态说明（仅当没有动态新闻时显示）”，并在字段下方显示“当前已有动态新闻记录，空状态说明不会出现在官网画布中。”
- 已在已登录 Directus 工作台实际验证此提示加载；截图：`output/playwright/dynamic-news-empty-state-visibility-20260831.png`。这项修正只消除错误对应关系，不将未显示的空状态文案计为当前画布可视化编辑闭环。

| 区块键 | 可见内容与字段路径 | 数据目标 | 当前状态 |
| --- | --- | --- |
| `hero` | 背景视频/海报、标题、说明 | `pages/9.sections[hero]` | `body`、`label` **已闭环，2026-08-27**：真实 PC 画布分别选中首屏说明和 CTA 按钮，属性栏准确显示 `pages · body`、`pages · label`；两项均完成即时同步、保存草稿、认证 Directus 回读、完整工作台重载和原值恢复。CTA 在编辑模式点击后 iframe 地址保持不变，不触发官网锚点跳转。`title` 当前仅作为视频无障碍标签，未在官网画面中渲染，不能作为可视化文字编辑项；背景视频/海报待正式素材 |
| `dynamic-news` | 区块标题、空状态说明 | `pages/9.sections[dynamic-news].title/description` | **`title` 已闭环，2026-08-26**：从画布选择标题，写入临时值 `动态新闻-TDD` 后保存；认证 Directus 回读、工作台重载、同一路径恢复原文和最终回读均已验证。**`description` 已完成自动化 API/预览闭环，2026-08-31**：`cms/scripts/verify-news-empty-state-preview.mjs` 临时写入唯一标记，认证回读 `pages/9.sections[dynamic-news].description` 后签发预览令牌并跳转到 `/news?cmsPreview=1`；Nuxt 的 `data-cms-preview-key="dynamic-news"` 区域实际渲染该标记，最后从最新服务器快照恢复原文并回读确认。最新结果：`savedTo=pages/9.sections[dynamic-news].description`、`previewTarget=pages/9/dynamic-news`、`restored=true`。管理员实际画布点击、属性面板保存、刷新和恢复仍需人工浏览器验收，不能以本自动化结果替代。 |
| `dynamic-news-records` | 新闻封面、分类、标题、业务日期、正文详情、同日排序 | `articles/{id}` | `articles/10.title` **已闭环并于 2026-08-27 复验**：画布命中 `articles · title`，临时标题即时显示、保存、认证回读、工作台刷新和原值恢复均完成；**2026-08-28 详情页闭环**：工作台“动态新闻内容”现打开 `/news/<slug>` 的真实详情画布，临时标题即时进入详情 iframe，认证回读 `articles/10` 后完整重载工作台仍显示该值，最后恢复“未命名文章”。公开详情路由仍返回 `410`，只有受控 `cmsPreview=1` 空壳会等待授权草稿叠加，不暴露草稿内容。`articles/10.display_date` **已闭环，2026-08-26**：画布命中 `articles · display_date`，临时值 `2026-08-25` 即时显示并保存，认证 Directus 回读一致，随后恢复为 `2026-08-24`；最终画布显示 `2026年8月24日`。`articles/10.body` **已闭环，2026-08-28**：动态新闻详情真实画布点击正文准确命中 `articles · body`；属性面板保留文章 `30000` 字符上限。验收先以失败测试修复“点击同一画布记录会用旧数据库数据覆盖未保存草稿”，现同一记录重选保留当前草稿，切换记录仍重新加载。临时正文即时显示、从属性面板保存后认证 Directus 回读、完整工作台重载均一致，最终恢复为空字符串并回读确认。`sort_order` 已完成单记录工作台保存/回读/刷新/恢复；**2026-09-01 分类控件修复**：详情画布点击分类后属性面板精确显示 `articles · category`，现在只提供“动态新闻（news）/ 视频分享（video）”下拉选项，拒绝未知值；在真实 Chrome 中切换到 `video` 会即时切换为视频素材界面，切回 `news` 后保存按钮重新禁用且未留下草稿修改。由于当前没有已审核视频素材，未把类型切换错误标作保存闭环。封面、正文媒体和其它文章字段仍待完成 |
| `video-sharing` | 视频、海报、标题、日期 | `articles/{id}` | 区块 `title`、`description` **已闭环，2026-08-27**：当前没有视频记录时，真实 PC 画布分别选中“视频分享”标题和“暂无视频分享。”空状态，属性栏精确命中 `pages · title`、`pages · description`；两项均完成即时同步、保存草稿、认证 Directus 回读、完整工作台重载和原值恢复。视频、海报、文章标题、日期仍待正式受治理媒体和真实视频记录；每页 6 条与日期倒序已有前台规则，需真实数据验收 |

### 本轮运行验证：动态新闻详情摘要

- 2026-08-28：`articles/10.summary` 起始为空。真实工作台在“视频新闻 -> 动态新闻内容”录入临时摘要后，详情 iframe 随即渲染摘要；在画布点击该段落，右侧属性栏精确显示 `articles · summary`。属性栏修改后的文字立即回写预览，保存后经认证 Directus 回读、完整工作台重载均保持一致，最后恢复为空。最终记录为 `draft/unpublished`，未把测试文字带入官网公开内容；截图为 `output/playwright/news-article-summary-visual-editing.png`。
- 2026-08-28：修复实时预览在 1440px 下挤压表单的问题。Chrome 截图复现后，先以失败测试定义菜单、表单和画布的最小宽度，再将中等桌面预览状态调整为 `176px / 360px / 520px` 三栏，大桌面为 `222px / 400px / 640px`。属性面板仍只在画布列内预留宽度；真实摘要编辑、保存、重载与原值恢复回归通过，CMS 全量测试 `301/301`，Directus `8055` 与 Nuxt `4175/news` 为 `200`。
- 2026-08-28：视频分享临时草稿验证 `articles.transcript`。第一轮画布未渲染文字稿，调试确认 CMS 发送字段正常，而 Nuxt 实时预览安全白名单遗漏 `transcript`；失败单测后将该受控字段加入文章白名单，私有字段仍被剥离。修复后真实画布可选中 `articles · transcript` 并即时更新，截图为 `output/playwright/news-video-transcript-visual-editing.png`。临时记录没有已发布视频媒体，点击保存被“视频分享至少需要关联一条已发布的视频素材”正确阻断，认证回读未写入文字稿，随后已删除临时记录；正式视频、封面与保存/重载闭环待正式受治理素材。

## 关于瑞钧：`pages/2`，`website/pages/about.vue`

| 区块键 | 可见内容与字段路径 | 数据目标 | 当前状态 |
| --- | --- | --- |
| `hero`、`brand-story` | 背景/前景、标题、强调文字、正文、列表 | `pages/2.sections[...]` | **首屏与品牌故事文字已闭环，2026-08-28**：`hero.title`、`hero.kicker`、`hero.description`、`brand-story.title`、`brand-story.kicker`、`brand-story.description`、`brand-story.body` 均完成真实 PC 画布选中、即时预览、保存草稿、认证 Directus 回读、完整重载和原值恢复。首屏后两项原草稿为空，官网正确使用默认显示值；写入后显示新值，恢复空值后默认显示值恢复。品牌故事正文取消虚假的 `body.0` 分段路径，所有正文区域选择唯一真实 `body`，禁用危险的段落级双击内联覆盖；编辑模式仅提升 Since/年份文字命中层，容器不遮挡正文。首屏与故事的非托管背景/前景媒体保持只读 |
| `overview` | 标题、正文、说明、列表、背景图 | `pages/2.sections[overview]` | **全部可见文字已闭环，2026-08-27**：`body`、`title`、`description` 及 `items.0.label` 至 `items.5.label` 都已完成真实 PC 画布选中、即时预览、保存草稿、认证 Directus 回读、完整工作台重载和原值恢复。列表项按失败测试将具有显式绑定的 `<li>` 加入预览桥候选，逐项保存确认不会串写相邻项；父级列表未开放编辑。`overview.body` 已移除 180 字 fallback 门槛；非托管背景图仍只读/待媒体，未计为可替换媒体闭环 |
| `history` | 可见英文标题 `kicker`、提示语 `label`、年份、事件、佐证；背景与图标 | `pages/2.sections[history]`、`milestones/{id}` | `kicker`、`label` **已闭环，2026-08-28**：真实 PC 画布选中、即时预览、保存、认证回读、完整重载和原值恢复均已完成。首条里程碑 `milestones/1.year/event/evidence` **已闭环，2026-08-28**：画布点击准确切到跨集合记录，三字段分别完成同一闭环且保持 `draft/unpublished`。第二条事件 `milestones/2.event` **已完成恢复性闭环，2026-08-29**：完整重载后确认临时值仍可读，恢复原文、保存、认证 Directus 回读和再次完整重载均一致，未串写其它记录。第三条事件 `milestones/3.event` **已完成共享自动化 API/预览闭环，2026-08-31**：同一临时值实际渲染于关于页与首页授权草稿画布，且 1、2 号里程碑保持不变，最后自动恢复第 3 号事件；完整证据见首页时间轴项。已修复单条里程碑预览只显示当前记录的问题：受控预览会携带同页完整时间轴列表，当前草稿只覆盖同 ID 项；真实 PC 画布确认当前有 6 条不同记录。`history.title` 在 PC 实际画面中被样式隐藏，不计可视化编辑完成；背景和导航图标未托管，继续只读/待媒体。其它里程碑记录与受治理媒体仍待验收 |
| `factory`、`certificates`、`honors`、`patents` | 区块标题、图库、图片名称 | 页面区块、`qualifications/{id}` | `factory.title`、`certificates.title`、`honors.title`、`patents.title` **已闭环，2026-08-28**：分别从“厂区风貌”“认证证书”“荣誉证书”“专利证书”真实 PC 画布点击标题，属性栏准确命中 `pages · title`；即时预览、草稿保存、认证 Directus 回读、完整重载、重新选中和恢复原文均通过。**字段级位置/样式已接入，2026-08-31**：上述标题及各章节可见小标题均使用独立 `field_presentation` 路径，默认不改变 PSD 布局；厂区标题已完成真实 Directus 保存、受保护 Nuxt 预览渲染和自动恢复验证（偏移 `3%`、字号 `40px`、行高 `1.4`、颜色 `#123456`）。**厂区图库媒体闭环，2026-09-05**：`factory.media[factory-1]` 通过受治理草稿素材完成 Directus 保存、受保护 Nuxt 预览渲染和完整页面快照恢复。荣誉标题验收中曾表现为消息已发送但 iframe 未更新，实际原因为 15 分钟预览令牌过期而安全拒绝消息；现会明确提示重新连接，不放宽过期消息。专利区块中的数量说明仍带 `requires_claim_review`，本次只验收中性标题字段；工作台已有厂区、认证、荣誉、专利的独立入口，素材记录由“资质与图库素材”管理；PSD/未托管证书只读 |
| `partners`、`clients-domestic`、`clients-global` | 标题、说明、品牌/客户图 | `pages/2.sections[...]` | `partners.title`、`clients-domestic.title`、`clients-global.title` **已闭环，2026-08-28**：三项均由真实 PC 画布点击分别命中对应页面区块的 `pages · title`，临时值即时更新 iframe；保存草稿后经认证 Directus 回读，完整工作台重载后再次选择均返回正确原值，最后恢复原文并完成最终回读。**字段级位置/样式已接入，2026-08-31**：标题与可见小标题各自使用 `field_presentation`，默认保持原布局，启用后仅影响被选中的文字。**图库媒体闭环，2026-09-05**：`partners.media[partner-1]`、`clients-domestic.media[domestic-1]`、`clients-global.media[global-1]` 分别通过受治理草稿素材完成串行保存、受保护预览渲染、客户区块隔离和完整快照恢复。工作台按合作品牌、国内客户、国外客户分开；说明未在当前模板中展示。素材均为内部 `draft/unpublished/pending_review`，不计公开发布 |

## 服务支持：`pages/3`，`website/pages/service.vue`

| 区块键 | 可见内容与字段路径 | 数据目标 | 当前状态 |
| --- | --- | --- |
| `hero` | 背景、标题、强调文字、正文、三条说明、按钮 | `pages/3.sections[hero]` | `title`、强调文字 `description`、正文 `body`、三条说明 `items.0.label`/`items.1.label`/`items.2.label`、按钮 `label` **已闭环，2026-08-27**：真实 PC 画布分别选中“售后服务”、内嵌“快人一步”、首屏说明、三条说明和“在线支持”，属性栏精确命中对应路径；均完成即时同步、保存草稿、认证 Directus 回读、完整工作台重载和原值恢复。嵌套字段测试确认 `items.0.label` 不会串写第二、第三条说明；静态背景仍只读，但其 `aria-disabled` 不再传播并阻断内部 CTA 选择；修复共用桥接对 `<em>` 的遗漏后，保持原有组合版式且不串写。**字段级位置/样式已接入，2026-08-31**：首屏 `kicker`、`title`、`description`、`body`、`label` 与三条说明均使用独立 `field_presentation` 路径，默认不改变 PSD 布局。`cms/scripts/verify-service-hero-title-presentation-preview.mjs` 已实际写入 `title` 的偏移 `3%`、字号 `40px`、行高 `1.4`、颜色 `#123456`，由 Directus 回读、受保护预览会话和 Nuxt HTML 渲染共同确认，随后自动恢复原内容及配置。**同日补充真实 PC 画布验收**：点击 iframe 的“售后服务”后属性面板命中 `pages · title`，临时标题“售后服务-画布验收”即时同步到 iframe；点击“保存草稿”后认证 Directus 回读，工作台“重新加载”后表单、iframe 与属性面板仍保持临时标题，随后从同一属性面板恢复“售后服务”、保存、重载及认证回读均确认 `restored=true`。背景待正式素材 |
| `support`、`support-models`、`support-actions` | 标题、说明、搜索/按钮文案、型号图标、服务入口图文 | `pages/3.sections[...]` | **`support.title` 已闭环，2026-08-26；`support.body`、`support.label`、`support.description`、`support-models.items.0.label`、`support-actions.items.0.title` 已闭环，2026-08-27；`support-models.items.1.label`、`support-actions.items.1.title` 已闭环，2026-08-28；`support-actions.items.2.title`、`support-actions.items.2.description`、`support-actions.items.3.description` 已闭环，2026-09-01**：从服务支持内容进入“瑞钧支持”，真实 PC 画布分别选中标题、正文、搜索 CTA、搜索框 placeholder、前两张型号卡片和服务入口卡片，属性栏精确命中对应字段；临时值 iframe 即时显示，保存后认证 Directus 回读、工作台重载一致，随后按同一路径恢复原值。第 3、4 张说明的验收均直接点击 `<small>` 正文，完整路径分别为 `pages/3.sections[support-actions].items.2.description` 与 `.items.3.description`；后者保存时断言第 3 张说明保持空值，两个字段最终认证回读均为空，未留下测试文字。**字段级位置/样式已接入，2026-08-31**：`support.title`、`body`、`description`、`label` 均有独立 `field_presentation` 路径，默认不改变原有搜索区布局；适用型号卡片名称和服务入口卡片标题/说明也各自使用条目级 `items.{index}.field_presentation.{label|title|description}`。映射会保留原始条目索引，避免过滤卡片后说明串写到另一条记录。`cms/scripts/verify-service-support-title-presentation-preview.mjs` 实际写入 `title` 的偏移 `3%`、字号 `40px`、行高 `1.4`、颜色 `#123456`，由 Directus 回读、受保护预览会话及 Nuxt HTML 渲染确认，随后自动恢复原内容与配置。**同日补充真实 PC 画布验收**：点击 iframe 的“瑞钧支持”后属性面板命中 `pages · title`；临时改字即时进入 iframe，保存后认证 Directus 回读，再点击“重新加载”仍保持，最终已从同一画布路径恢复“瑞钧支持”。这是跨组件预览桥接器接管时立即装饰已渲染字段的回归验证，截图为 `output/playwright/service-support-title-canvas-selection-fixed-20260831.png`、`service-support-title-save-reload-20260831.png` 和 `service-support-title-restored-20260831.png`。`cms/scripts/verify-service-action-card-title-presentation-preview.mjs` 已进一步验证第一张服务入口标题的字段级样式进入预览，同时断言第二张卡片在保存、预览和恢复期间完全不变。其它型号图标和服务入口图案仍为未托管媒体，待正式媒体治理 |
| `office-directory` | 标题、地区图/地图、地址、负责人、电话 | 页面区块或 `service_locations/{id}` | 当前官网实际优先读取 `pages/3.sections[office-directory].items`，而该页面草稿已有 10 个区域嵌套项；工作台“国内直属办事处”已改为打开此页面区块画布，“服务网点记录”单独管理独立记录。区域首项 `items.0.title` 与首网点 `items.0.offices.0.address`/`manager`/`phone` **已闭环，2026-08-27**：画布分别选中“外贸商务”、地址、负责人和电话；即时同步、保存草稿、认证 Directus 回读、完整工作台重载与原值恢复均完成。第二个区域 `items.1.title`、首网点地址 `items.1.offices.0.address` 与负责人 `items.1.offices.0.manager` **已闭环，2026-08-28**：重载后画布分别精确命中“长三角区”、“昆山店：昆山市城北路1255号”和“王晓枫经理”，临时值即时进入 iframe，保存后的 Directus 回读、原值恢复与完整工作台重载一致。第三个区域 `items.2.title` **已完成自动化 API/预览闭环，2026-08-31**：`cms/scripts/verify-service-office-third-region-preview.mjs` 临时写入“珠三角区”标题，认证 Directus 回读和 `/service?cmsPreview=1` 实际渲染均命中该标记；同次运行明确确认 `items.0.title`、`items.1.title` 在保存、预览与恢复后保持原值，最后从最新服务器快照恢复原文。**页面草稿来源的标题现支持字段级位置/样式，2026-08-31**：区块 `kicker/title` 及各地区 `items.{index}.{title|label}` 各有独立 `field_presentation` 路径，默认不改变原列表、地图或网点布局；`cms/scripts/verify-service-office-first-region-title-presentation-preview.mjs` 临时写入首个地区标题和 `3% / 32px / 1.4 / #123456`，Directus 回读、预览会话与 Nuxt HTML 均确认渲染，同时 `items.1` 保持不变，随后自动恢复。独立 `service_locations` 仍只提供文字编辑，不虚报为可调样式。第三个区域首门店的 `items.2.offices.0.address`、`items.2.offices.0.manager` **已完成双字段自动化 API/预览闭环，2026-08-31**：`cms/scripts/verify-service-office-third-region-contact-preview.mjs` 同时写入地址和负责人，认证回读与 `/service?cmsPreview=1` 实际画布均显示两条标记；同次验证确认 `items.2.offices.1` 完整对象未改变，最后恢复两个字段。**地址 `items.2.offices.0.address` 已完成真实 PC 画布闭环，2026-08-31**：直接点击 iframe 的“东莞长安店”地址，属性面板精确命中该五层路径；临时地址即时同步，保存后管理员 Directus 回读通过，工作台“重新加载”后仍显示临时值，最终恢复原地址并再次认证回读。截图：`output/playwright/service-office-third-region-address-visual-editing-20260831.png`。负责人仍待相同的人机闭环。五层嵌套测试确认地址保存不串写负责人或电话。其它区域电话及其它地区字段待逐项验收；地区图/地图待正式媒体。跨集合回归已验证：从页面预览切换到 `product_models/15` 后旧属性面板清空，点击 `fl1180` 命中 `product_models · model_code`，未串写服务标题 |

2026-08-31 更新：上述第三地区首门店的“地址/负责人待人工验收”状态已解除。工作台直接在真实 iframe 依次点选“东莞长安店：东莞市长安镇振安东路768号”和“孙金诚经理”，属性面板分别精确命中 `pages · items.2.offices.0.address` 与 `pages · items.2.offices.0.manager`。两项均完成临时值即时同步、保存、管理员 Directus 回读、工作台重载和原值恢复；负责人保存还断言地址保持原值。截图：`output/playwright/service-office-third-region-address-visual-editing-20260831.png`、`output/playwright/service-office-third-region-manager-visual-editing-20260831.png`。

2026-08-31 修复：第三地区首门店电话 `pages/3.sections[office-directory].items.2.offices.0.phone` 的画布编辑此前只停留在实时预览，保存请求未带出字段。根因是历史办事处对象没有 `phone` 键，而受控写入拒绝创建未知字段。工作台读取服务页面草稿时现会仅为 `office-directory` 的既有门店补齐空 `phone` 字段；真实 PC 画布点击“未填写联系电话”后输入 `13300000000`，属性面板、iframe 和 `PATCH /items/pages/3` 请求均命中该五层路径，完整刷新工作台仍读取到该值，随后已清空并保存恢复。该兼容处理不改变 Nuxt 公开版式。

**2026-08-28 补充：** 多数办事处原始数据没有 `phone`，公开模板因此不渲染电话节点，无法从画布选择。现以失败测试补入仅 CMS 编辑模式可见的“未填写联系电话”受控占位；其字段路径仍为真实 `items.{region}.offices.{office}.phone`，公开 Nuxt 页面保持隐藏。真实画布已选中 `items.1.offices.0.phone`，填入验收值后通过保存链路，最终重新载入后再次显示空占位；MySQL 直接回读确认该字段恢复为空，不保留测试号码。

## P0-3 选择顺序

1. 首页：`product-task.title` 已有完整闭环；后续选择尚未覆盖的真实区块或受治理媒体。
2. 产品：`product_parameters/94.value`、`product_parameters/94.field_name`、`product_parameters/94.unit` 已闭环；后续选择其它型号字段或受治理的尺寸图完成下一样本。
3. 先进制造：`pages/8.sections[precision-machining].title` 已闭环；后续从工艺节点、其他区域文字或正式媒体中选择不同字段。
4. 视频新闻：`articles/10.display_date` **已闭环，2026-08-28**：真实画布选中日期后，临时值 `2026-08-25` 立即渲染为“2026年8月25日”；保存后认证 Directus 回读一致，恢复 `2026-08-24` 后完整工作台重载再次精确命中 `articles · display_date`。
5. 关于瑞钧：`pages/2.sections[overview].body` 已闭环；后续选择标题、说明、列表或一个共用里程碑字段。
6. 服务支持：`pages/3.sections[support].title` 或 `service_locations/{id}` 的地址字段。

每一项都必须执行：画布选中 -> 即时预览 -> 工作台保存 -> 受保护 Directus 回读 -> 工作台重载 -> 原值恢复。未完成之前不得把“已声明待闭环”升级为“已闭环”。

2026-09-01 增量：产品型号能力图片 `product_models.configuration.features.{index}.image` 已完成受控绑定、位置展示路径、测试和真实 PC 可逆验收。工作台在 `FL1610 (product_models/17)` 首项能力临时选择内部预览草稿 `media_assets/27`，iframe 图片点击后属性面板命中 `configuration.features.0.image`；偏移 `18/12` 即时生效。保存、认证 Directus 回读、完整重载均确认 `media_asset_id=27` 与位置配置持久化。最后恢复 `media_asset_id=null` 和双偏移 `0`，并由认证回读确认没有测试残留。该记录未把草稿素材误报为可公开发布。

2026-09-01 运行界面复核：工作台桌面固定菜单的安全间距已同时覆盖工具栏与内容区；在 `929x900` 真实浏览器中，“官网内容编辑”“使用说明”“选择要修改的网站区块”及首页任务卡均不再被菜单边缘遮挡。点击“首页视频”后能进入 `pages/1` 的首页首屏编辑区，预览入口随之可用。修复仅限 CMS 扩展布局，未改 Nuxt 官网布局。

2026-09-01 增量：先进制造 `pages/8.sections[core-equipment].media.0` 的透明按钮式画布层现在可进入“媒体替换”。真实工作台在“先进制造 -> 生产核心设备 -> 打开实时预览 -> 媒体”点击“平面磨床”后，右侧属性面板命中该精确路径，并显示内部草稿候选 `equipment-1.png`。修复仅识别显式 `media.{index}` 的按钮路径，普通 CTA 仍为文字/链接编辑。当前只有一个私有草稿候选，未选择、保存或公开发布，因此不把图库多素材替换或公开上线标为完成。截图：`output/playwright/manufacturing-core-equipment-media-selected-20260901.png`。

2026-09-01 增量：首页 `pages/1.sections[hero].hero_video_asset_id` 的视频选择器与 Nuxt 预览播放器已完成真实保存/重载闭环。此前字段选择、预览消息和 CMS 资产 URL 都正确，但 `<source>` 子节点更新不会触发浏览器重载已存在的 `<video>`，导致画布仍播放默认 `/assets/home-intro-raw.mp4`。现直接受控绑定 `<video :src>` 并按源地址重建节点。真实浏览器已验证草稿 `media_assets/49` 立即播放受保护 CMS 资产，切回“沿用官网原首屏视频”立即回退默认视频，选回草稿、保存后认证 Directus 回读 `hero_video_asset_id=49`，完整工作台重载后选择器与 iframe 均保留。截图：`output/playwright/home-hero-video-select-save-reload-restore-20260901.png`。该素材仍为仅内部预览的草稿，不计为公开发布或正式媒体审核完成。

2026-09-01 运行界面复核：`1280-1599px` 的实时预览改为左侧栏目导航加全宽画布模式，避免表单、画布和属性栏三列同时压缩。1440px 已测得画布容器 `892 x 836px`；选择 `FL1180` 的 `model_code` 后属性面板正常打开，画布仍保留约 576px 的可编辑官网区域。关闭实时预览即恢复原结构化表单，未改 Nuxt 官网布局。截图：`output/playwright/workbench-medium-desktop-canvas-1440-20260901.png`、`output/playwright/workbench-medium-desktop-canvas-property-1440-20260901.png`。

2026-09-01 增量：服务入口第 3 项 `pages/3.sections[support-actions].items.2.title` 已完成真实 PC 可逆闭环。真实画布点击“服务流程与寄修”后属性面板精确命中该嵌套路径；临时改字即时渲染，保存后认证 Directus 回读 `HTTP 200` 且仍为 `draft/unpublished`，工作台“重新加载”后的 iframe 与属性栏均保留测试值。最终从同一属性面板恢复“服务流程与寄修”并认证回读确认，无测试数据残留。截图：`output/playwright/service-support-action-third-title-restored-20260901.png`。该项不包含服务入口图案或图片的媒体替换。

2026-09-01 增量：先进制造 `pages/8.sections[core-equipment].media.0` 的不同图片替换完成真实 PC 可逆闭环。四张设备候选来自用户提供的 `素材/先进制造/先进制造(1).psd` 的现有图层，已整理到 `素材/先进制造/设备照片/` 并由导入器按来源路径去重；资产 51-54 均为 `pending_review + draft + unpublished`，不会进入公开页面。因三张真实图层为 `740x415`，设备展示位最低高度已从错误的 416 修正为 415，仍保持 740px 宽度与内部审核限制。画布选择“平面磨床”后，右侧属性栏精确命中该路径；选择资产 52 时，字段立即为 `{"media_asset_id":"52","role":""}`，iframe 显示“立式加工中心”。保存草稿、点击工作台“重新加载”后选择和预览保持 52；随后选回 50、保存并截图确认“平面磨床”已恢复。媒体导入/治理定向测试 `21/21` 与 Directus 健康检查通过。此闭环不代表可公开发布，必须先完成媒体版权与发布审核。
