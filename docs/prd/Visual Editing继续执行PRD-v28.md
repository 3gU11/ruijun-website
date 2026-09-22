# 瑞钧官网 Visual Editing 继续执行 PRD

> 2026-09-08 最新增量：产品型号资料列表补齐真实画布编辑绑定。此前工作台可以维护 `product_models.resources`，但产品详情 Nuxt 只渲染资料类型、标题和链接，没有字段路径，因此只能从表单编辑，不能从画布点选。本轮将资料区明确绑定到当前 `product_models/{id}`，每条资料分别绑定 `resources.{index}.type`、`resources.{index}.title`，链接节点同时声明受控 `resources.{index}.url`；编辑模式拦截链接，浏览模式保留原下载/跳转行为。真实 PC 工作台在 FL1610（`product_models/17`）临时新增一条站内资料后，从 iframe 分别点中类型、标题和整条链接，属性面板路径准确，临时值即时显示并保存；管理员受保护 Directus 回读为 `PDF-VECHK / FL1610 产品资料-VECHK / /service/download?from=vechk`，工作台“重新加载”后三项均保持。随后从表单删除临时资料并保存，最终认证回读和再次重载确认 `resources=[]`、页面无 `VECHK` 标记，记录仍为 `draft/unpublished`。同时移除型号资料画布中英文眉题错误继承为 `product_models.kicker` 的假绑定；该页面区块文案仍由独立“产品资料区标题”入口编辑。网站全量测试 `429/429`、Nuxt 生产构建通过。此项只证明资料文字与受控链接的可视化闭环，实际附件文件替换仍需用受治理文档素材验收。

> 2026-09-08 最新验收：服务支持页补齐两条真实 PC 文字编辑链路。页尾“需要人工协助？”可从 Nuxt iframe 选中并精确写入 `pages/3 · sections[support].content.human_support_label`；第 5 张服务入口“技术文件下载”可精确写入 `pages/3 · sections[support-actions].items.4.title`。每项均验证画布即时同步、保存页面草稿、管理员受保护 Directus 回读、工作台重新加载保持和原文恢复；恢复后再次回读及重载确认无测试残留，`pages/3` 保持 `draft/unpublished`。本轮没有验证服务入口其它卡片、图标媒体、审核或公开发布。

> 2026-09-08 最新验收：服务入口数组后半段也完成真实 PC 标题编辑验证。第 6 至第 8 张卡片“常见故障分析”“保养与易损件”“知识分享”从 iframe 对应按钮分别命中 `pages/3 · sections[support-actions].items.5.title`、`.items.6.title`、`.items.7.title`。临时文字逐项即时渲染并保存；管理员受保护 Directus 回读同时确认三个持久化值，工作台重新加载后每项仍命中自身路径。恢复原文后再次回读和重载，`items.4` 至 `.items.7` 均无测试值。该验收只证明后四张卡片标题可编辑和保存，不代表说明、图标、附件、审核或公开发布完成。

> 2026-09-08 最新验收：服务支持“在线售后服务”已完成真实 PC 文字编辑闭环。工作台打开“服务支持 -> 瑞钧支持”的实时 Nuxt iframe 后，在线服务标题、说明、助手主标题、助手说明、助手按钮和三步流程的标题/正文均可从实际画布精确选中，属性面板路径为 `pages/3 · sections[support].content.<field>`。临时文字即时同步，保存页面草稿后由管理员受保护 Directus 接口回读，点击“重新加载”后画布和属性面板保持；所有临时文字随后按同一路径恢复并保存。最终 `pages/3` 仍为 `draft/unpublished`，无测试残留。本项确认此区块文字可修改和保存，不把审核发布、静态素材或其它服务区块计为完成。

> 2026-09-05 最新验收：视频分享已完成真实 PC 工作台“替换视频 -> 保存 -> 重载 -> 恢复原视频”闭环。登录工作台进入“视频新闻 -> 视频分享内容”，上传并登记临时 `home-intro.mp4` 候选，添加到 `articles/36` 后移除原“展会快闪开头.mp4”，保存草稿并重载；工作台和 Nuxt 实时 iframe 保持临时视频关联。随后重新添加原视频、移除临时视频、保存并重载，原视频关联恢复。独立脚本 `node cms/scripts/verify-news-video-switch-preview.mjs` 同步验证受保护视频预览 `200 video/mp4`、预览页面为 `/news?cmsPreview=1`、Directus 文章媒体引用恢复，并清理临时媒体与文件。该项确认“后台替换视频、草稿持久化、实时预览、恢复原值”达到可用闭环；视频仍为草稿，未绕过审核公开。

> 2026-09-05 最新验收：服务资料 PDF 已完成真实 PC 管理员工作台闭环。登录工作台后进入“服务支持 -> 服务资料与视频教学”，在“媒体资产”中选择合法 PDF，填写使用范围“服务资料”、展示位置 `service.document`、页面 `service`、区块 `download` 及标题/说明，点击“上传并登记候选素材”；清单即时出现 `TDD服务资料附件 · tdd-valid-service.pdf · application/pdf` 草稿。随后在服务资料表单填写标题、摘要、正文并选择该附件，点击“保存服务内容”；实时 Nuxt 预览画布实际出现下载链接“下载 TDD服务资料工作台附件”，受保护预览路径为 `/api/preview/media/<assetId>`。独立脚本 `node cms/scripts/verify-service-resource-download-preview.mjs` 同步验证资源保存、受保护 PDF 返回 `200 application/pdf`、下载字节数 `585`、公开 API 不泄露（`publicLeaked:false`）并恢复原记录。浏览器使用 Playwright CLI；测试服务资料、媒体资产与 Directus 文件均已删除，工作台重载后无测试标题残留。该项确认“上传媒体、绑定附件、预览、下载、公开隔离”达到可用闭环；不代表正式审核发布或六页全部字段完成。

> 2026-09-05 最新验收：内容编辑工作台完成真实 PC 管理员“上传并登记候选素材”闭环。登录 `http://127.0.0.1:8055/admin/ruijun-content-editor-workbench`，进入“高级设置 -> 媒体资产”，选择现有站内 `service-action-1.png`，填写使用范围“服务资料”、展示位置 `service.action.icon`、页面 `service`、区块 `support-actions`、标题、替代文本和来源说明后点击“上传并登记候选素材”。浏览器实际请求 `POST /files` 与 `POST /items/media_assets` 均返回 `200`；工作台清单即时出现该候选，Directus 受保护回读为 `media_assets/298`，关联文件为 `6af7d238-4682-4782-acee-04e7e5b2deb2`，尺寸 `65×42`、类型 `image/png`、状态 `draft/unpublished`。随后仅针对这两个已核对的临时 ID 使用管理员会话删除，均返回 `204`；重新加载工作台后按标题检索无匹配，确认无测试素材残留。该项证明管理员可通过 UI 上传、登记并进入受治理草稿库；删除候选仍未作为正式工作台能力提供，正式素材仍须业务版权审核后发布，不代表六页全部媒体槽位已完成替换验收。浏览器插件不可用，本轮使用 Playwright CLI 真实 Chrome；截图：`.playwright-cli/page-2026-09-05T02-26-48-629Z.png`。

> 2026-09-01 最新验收：先进制造首屏背景已完成真实 PC 草稿媒体替换闭环。工作台“先进制造 -> 制造首屏”可选择内部草稿 `hero-building.png`（`media_assets/55`），添加并填写展示位置 `hero-building` 后保存。实时画布在“媒体”模式点击“瑞钧智科生产基地”，属性面板精确命中 `pages/8 · sections[hero].media.0`，且 iframe 图片来源为受保护的 CMS 素材地址 `/assets/897c4e26-d1bf-4650-ad38-f897fc754afa`。工作台重新加载后仍保留该关联；随后移除该测试关联并保存，已恢复静态 fallback。截图：`output/playwright/manufacturing-hero-media-restored-20260901.png`。本次素材与页面均保持 `pending_review/draft/unpublished`，没有发布到公开官网。由于候选内容与原首屏画面相同，本项证明可替换、保存、重载与恢复，不宣称肉眼可见的画面差异。

> 2026-09-04 最新验收：关于瑞钧“首屏背景图层”完成真实 PC 工作台可逆闭环。工作台“关于瑞钧 -> 关于瑞钧首屏”选择受治理草稿候选 `hero-machine.jpg`（`media_assets/189`），用途设为“首屏背景图层”后保存页面草稿。实时 Nuxt iframe 的背景层计算样式实际为 `/api/preview/media/189`，图片节点同样使用该受保护路径，机器前景仍保留原静态层；工作台“重新加载”后素材关联和预览路径均保持。随后在同一表单移除素材并保存、重新加载，图片与背景计数回到 `0`，iframe 恢复 `/assets/about-psd/banner.jpg` 与 `/assets/about-psd/hero-machine.jpg`。`npm run visual:verify-about-hero-media` 亦完成独立写入、受保护预览与完整 `sections` 快照恢复。页面和素材保持 `draft/unpublished`，未改公开 Nuxt 布局、路由、动画或发布状态。本项只覆盖背景图层，不代表共享背景或机器前景已完成替换验收。

> 2026-09-01 最新验收：服务支持“国内直属办事处”第三地区标题 `pages/3.sections[office-directory].items.2.title` 完成真实 PC 画布保存、重载与恢复闭环。直接点击 Nuxt iframe 的“珠三角区”后，属性面板精确命中完整嵌套路径；临时改为“珠三角区-画布验收”即时同步到画布，点击“保存草稿”后工作台显示已保存，点击“重新加载”后 iframe 和属性面板仍保持测试值。随后从同一属性面板恢复“珠三角区”、保存并再次重载，画布与属性值均已恢复，没有遗留测试文字。此轮证据是实际管理员画布路径，不把地区图片、地图或公开发布计为完成。

> 2026-09-01 修复验收：先进制造“生产核心设备”首张卡图 `pages/8.sections[core-equipment].media.0` 原已绑定内部草稿素材 `media_asset_id=50`，但画布属性下拉错误显示“选择媒体”，易误导为未绑定。按失败测试补充受控媒体 ID 读取：仅 `media_asset_id` 关系对象、白名单标量媒体字段或 `media/assets` 列表项可回显，普通标题不会被误作媒体。重建并重启 Directus 后，真实 PC 画布在“媒体”模式点选透明的“平面磨床”放大按钮，属性面板精确命中该路径并正确选中 `equipment-1.png · image/png`。截图：`output/playwright/manufacturing-core-equipment-media-selection-restored-20260901.png`。当前只有这一项符合规格的内部草稿候选，尚不能证明“替换为另一张不同图片 -> 保存 -> 重载 -> 恢复”的完整链路，亦不计为公开发布。

> 2026-09-01 最新验收：服务支持第 4 张服务入口卡片说明 `pages/3.sections[support-actions].items.3.description` 完成真实 PC 可逆闭环。临时新增“视频教学内容说明”后，直接点击 Nuxt iframe 中的 `<small>` 正文，属性面板精确命中该路径；保存后认证 Directus 回读 `HTTP 200`、`draft/unpublished`，同时相邻第 3 张卡片说明保持空值。工作台重载后画布仍显示测试值；随后从同一属性面板恢复为空，再次认证回读为空且重载后临时文字不存在。截图：`output/playwright/service-support-action-fourth-description-saved-20260901.png`。本项只覆盖第 4 张卡片说明文字，不代表服务入口图案、图片或公开发布已完成。

> 2026-09-01 最新验收：服务支持第 3 张服务入口卡片说明 `pages/3.sections[support-actions].items.2.description` 完成真实 PC 可逆闭环。先通过表单临时新增“寄修流程与进度说明”，实时预览直接点击该 `<small>` 正文后属性面板精确命中完整字段路径，而非父级按钮或标题；保存后认证 Directus 回读 `HTTP 200`、`draft/unpublished`，工作台重载后画布仍显示测试值。随后从同一属性面板恢复为空，再次认证回读为空且完整重载后临时文字不存在。截图：`output/playwright/service-support-action-third-description-saved-20260901.png`。本项只覆盖第 3 张卡片说明文字，不代表服务入口图案、图片或公开发布已完成。

> 2026-09-01 最新验收：先进制造“智能物料仓储”标题 `pages/8.sections[smart-warehouse].title` 完成真实 PC 可逆闭环。iframe 选中后临时改为“智能物料仓储-画布验收”，保存后认证 Directus 回读 `HTTP 200`；完整重载后工作台区块表单、中央 Nuxt 画布和属性面板均保留测试值。随后恢复“智能物料仓储”，认证读回确认原文恢复。截图：`output/playwright/manufacturing-smart-warehouse-title-restored-20260901.png`。本项只覆盖标题文字，不代表该区域图片或媒体已完成。

> 2026-09-01 最新验收：服务支持第 4 张适用型号卡片 `pages/3.sections[support-models].items.3.label`（“FT-XS”）完成真实 PC 可逆闭环。iframe 精确选中后临时改为“FT-XS-画布验收”，保存后认证 Directus 回读 `HTTP 200`；完整重载后表单、属性面板和卡片文字均保留。恢复后认证读回同时确认相邻第 1、2 项仍为“灵动工作站”“FR-XS(auto)”，第 4 项恢复“FT-XS”。截图：`output/playwright/service-support-model-fourth-restored-20260901.png`。本项只覆盖卡片名称，不代表卡片图标或图片已完成。

> 2026-09-01 最新验收：服务支持搜索按钮文案 `pages/3.sections[support].label` 完成真实 PC 可逆闭环。编辑模式点击 iframe 的“咨询 AI”未触发原查询，而是精确进入属性面板；临时改为“在线咨询-画布验收”即时进入画布，保存后认证 Directus 回读 `HTTP 200`，完整重载后表单、属性面板和按钮均保留。随后恢复“咨询 AI”，认证回读同时确认 `supportDescription` 仍为原文。截图：`output/playwright/service-support-label-restored-20260901.png`。本项只覆盖按钮文案，不代表服务入口图标或图片已完成。

> 2026-09-01 最新验收：服务支持搜索框提示词 `pages/3.sections[support].description` 完成真实 PC 可逆闭环。iframe 点击真实输入框后属性面板精确命中该路径；临时改为“请输入设备型号或故障现象-画布验收”即时进入预览，保存后认证 Directus 回读 `HTTP 200`，完整重载后表单、属性面板和真实输入框均保留。随后恢复“输入设备型号、故障现象、维修进度或保修问题”，认证回读确认原文恢复。截图：`output/playwright/service-support-description-restored-20260901.png`。本项只覆盖提示文字，不代表服务入口图标或图片已完成。

> 2026-09-01 最新验收：FL1610 第四项能力标题 `product_models/17.configuration.features.3.label`（“全新3.0控制系统”）完成真实 PC 可逆闭环。iframe 精确选中后临时改为“全新3.0控制系统-画布验收”，保存后认证 Directus 回读 `HTTP 200`，仅第 4 项为测试值；工作台重新加载后型号表单、iframe 与属性面板均保持。随后恢复原文并认证回读四项能力标题依次为“`五轴数控`、`四轴螺距补偿`、`辅助上丝功能`、`全新3.0控制系统`”。截图：`output/playwright/product-FL1610-all-feature-labels-restored-20260901.png`。本项不代表能力图片、说明或工程图已完成。

> 2026-09-01 最新验收：FL1610 第三项能力标题 `product_models/17.configuration.features.2.label`（“辅助上丝功能”）完成真实 PC 可逆闭环。先确认工作台记录为 `FL1610 / product_models/17`，从 iframe 选中该文字；临时改为“辅助上丝功能-画布验收”即时进入画布，保存后认证 Directus 回读 `HTTP 200` 为测试值，工作台重新加载后表单与 iframe 均保持。随后恢复原文并再次认证回读 `feature2Label=辅助上丝功能`。截图：`output/playwright/product-FL1610-feature-3-restored-20260901.png`。本项不代表能力图片、说明或工程图已完成。

- 版本：v28.1（重整执行版）
- 日期：2026-08-26
- 状态：继续执行，未发布就绪
- 范围：PC 编辑端；手机端本期只做官网展示回归
- 系统：Nuxt 官网、Directus CMS、MinIO、MySQL `127.0.0.1:3307`
- 唯一执行基线：本文件。旧版 `Visual Editing继续执行PRD-v*.md` 仅保留过程记录，不再作为开发依据。

## 2026-08-31 本轮可见成果

- 2026-09-01：网站主页“三大特点”第二项可见标题 `pages/1.sections[advanced-manufacturing].introTitle` 完成真实 PC 画布可逆闭环。工作台从“网站主页 -> 三大特点”打开真实 Nuxt 画布，直接点击“先进智造”后右侧属性面板精确命中完整字段路径；临时改为“先进智造-实时验证”立即反映到 iframe，保存草稿并点击“重新加载”后仍保留。认证 Directus 回读为 `HTTP 200 / draft / unpublished / introTitle=先进智造-实时验证`。随后从同一属性面板恢复“先进智造”、保存、重新加载并再次认证读取，确认恢复且未发布。截图：`.playwright-cli/page-2026-09-01T10-49-24-878Z.png`。本项只覆盖该首屏理由标题，不代表对应背景图、横移大标题或其余理由已完成媒体闭环。

- 2026-09-01：修复“视频分享候选素材”被错误当作可编辑文章的 P0-B 绑定缺口。事实：`/api/public/v1/media/news.video_share.list` 当前返回空数组；当该接口有候选视频、但尚未建立 `articles` 视频分享记录时，旧 Nuxt 代码仍会向画布提供 `video_url/title/display_date` 的伪字段路径，继承页面记录后可能形成没有真实文章目标的假编辑入口。现改为仅 `articles/id` 完整存在时显示可编辑字段；未建文章的候选卡片在画布点击后显示“该候选视频尚未建立‘视频分享’文章，不能直接改写页面。请先新建视频分享内容并关联此媒体。”，不会生成写入路径。只读原因由 Nuxt 预览桥传至工作台属性栏。TDD：官网定向 `86/86`、CMS 定向 `61/61`、官网全量 `384/384`、CMS 全量 `399/399` 通过；Nuxt 生产构建已在保留现有 `4175` 开发服务的条件下生成当前产物，现有开发服务 `GET /news` 返回 `200`。Directus 已重建并重启，`GET /server/health` 返回 `200`；真实 Chrome 已加载“视频新闻”工作区及五个业务入口。由于当前候选数组为空，不能验证不存在的候选卡片点击，待导入真实候选媒体后复验；未创建演示资讯、未发布任何内容、未变更 Nuxt 版式。

- 2026-09-01：画布重复卡片补齐受控“复制、删除、上移、下移”操作。真实 PC 工作台从“服务支持 -> 服务入口”打开实时预览，选中第 3 张“服务流程与寄修”后，右侧属性栏显示 `pages/3 · sections[support-actions].items.2.title`、`当前第 3 项，共 8 项` 及四个列表按钮。点击复制后即时选中新第 4 项，显示为“共 9 项”；服务卡片复制会生成独立编号和媒体位置（`01/action-1` 的示例复制按当前最大值产生 `09/action-9`），不会与原图标槽串用。点击保存草稿后，受保护 Directus 回读确认第 4 项为 `09/action-9`、总数为 9；随后恢复原数组并认证回读为 8 项，重新加载的画布属性栏也显示“共 8 项”。页面始终为 `draft/unpublished`，没有发布。CMS `397/397` 通过，扩展重建、Directus 健康检查和服务页实时预览回归均通过。该项覆盖受控数组卡片操作；不把所有页面列表、独立图库记录或公开发布记为完成。
- 2026-09-01：视频新闻空白草稿清理完成真实运行闭环。发现 `articles/10` 为系统生成的 `cms-editor-article-*` 默认草稿，状态为 `draft/unpublished`，没有摘要、正文、媒体或来源；它不属于公开官网内容，但工作台会直接打开其详情画布，容易被误认为正式资讯。按 TDD 新增仅允许 `draft + unpublished` 文章/视频草稿删除的约束；审核中、已发布和归档记录没有删除入口。重建扩展、重启 Directus 后，真实 Chrome 从“视频新闻 -> 动态新闻内容”确认按钮出现，确认删除后列表为 `0`、编辑区提示新建草稿，旧实时 iframe 已关闭。截图：`output/playwright/news-empty-draft-cleanup-20260901.png`。CMS 全量 `369/369` 通过；不修改 Nuxt 官网布局或公开页面内容。
- 2026-09-01：修复首页三大特点画布属性面板的写入目标说明。此前点击官网“先进智造”虽能进入正确字段，但面板只显示 `pages · introTitle`，编辑者无法确认它对应哪个理由区块。现在面板显示完整来源 `pages/1 · sections[advanced-manufacturing].introTitle`；真实 Chrome 已在“网站主页 -> 三大特点”画布复测，文字、位置和样式控件保持可用。截图：`output/playwright/home-advanced-manufacturing-record-source-20260901.png`。本项只改 CMS 工作台说明，不改 Nuxt 官网布局、页面数据或发布状态。
- 2026-09-01：完成跨集合产品记录的同一来源标识验收。真实 Chrome 在“产品展示 -> 产品型号、参数与尺寸图”选择 FL1610（Directus `product_models/17`），打开实时预览并点击“`五轴数控`”；右侧属性面板显示 `product_models/17 · configuration.features.0.label`，同时保留文字、位置、字号、字重、行高和颜色控件。截图：`output/playwright/product-FL1610-record-source-20260901.png`。本项证明的是画布选择与写入目标可追踪，不代表产品页全部字段、正式媒体或发布流程已完成。
- 修正“视频新闻 -> 动态新闻标题”中的错误内容对应：当前已有动态新闻文章时，空状态文案不会出现在官网画布，工作台现在明确标示该限制，避免编辑者误以为所改内容正显示在官网。
- 已在运行中的 Directus 工作台验证，界面证据：`output/playwright/dynamic-news-empty-state-visibility-20260831.png`。
- 本项是 CMS 内容准确性修复，不修改 Nuxt 官网布局，也不把“空状态字段”误计入当前已完成的画布编辑闭环。

## 1. 结论与产品决定

### 1.1 需要实现的产品

CMS 需要提供一个按官网六个 Header 页面组织的内容编辑工作台。编辑者在同一工作台中选择页面和页面区块，在中央真实 Nuxt 画布上选择元素，通过顶部工具栏和右侧属性面板修改已建模的文字、图片、视频、列表和有限的视觉参数；保存为草稿、预览、审核并发布。

页面导航固定为：网站主页、产品展示、先进制造、视频新闻、关于瑞钧、服务支持。进入任一页面后只展示该页面的业务区块，例如首页视频、三大理由、产品系列、时间轴；不得出现第二层重复的“网站主页/产品展示”等分类。

### 1.2 不做的产品

本期不是任意页面搭建器，也不是自由 CSS/HTML 编辑器。用户可以调整的内容必须受页面模板约束，禁止任意删除区块、改变 PSD 几何结构、动画、路由、锚点、断点和响应式规则。

这不是功能缩水，而是实现“可编辑”与“原 Nuxt 画面不被打乱”两个目标的必要边界。若开放无约束拖拽、任意尺寸或 CSS，原 PSD 布局、PC/移动端适配和动画会失去可验证性。后续如确有自由编排需要，应另建“新建专题页”能力，不能直接用于现有官网模板。

## 2. 当前事实、缺口与风险

| 范围 | 已验证事实 | 当前状态 | 后续动作 |
| --- | --- | --- | --- |
| 工作台框架 | 可进入六页工作台，并加载真实 Nuxt iframe | 部分完成 | 继续整理为“页面 -> 业务区块”，避免重复分类 |
| 文字真实闭环 | 多个页面、记录和嵌套字段已完成选中、即时预览、保存草稿、受保护回读、刷新和恢复原值 | 已完成样本，非全量 | 以同一标准补齐清单中的每个可见字段 |
| 字段级位置与样式 | 首页 `product-task.title` 可独立保存受控横向/纵向偏移、字号和字重，不影响同区块正文 | 已完成样本，非全量 | 将同一受控模型逐项接入其它已绑定的可见字段 |
| 产品卡片选择 | 编辑模式会阻止卡片展开；选择/文字模式选名称，媒体模式选封面 | 已完成样本 | 完成型号记录切换的浏览器回归 |
| 记录切换 | 里程碑工作台顶部可切换 6 条记录；已验证 `milestones/1 -> 2` 会清空旧属性、保留预览会话并重新选中正确字段 | 部分完成 | 以同一浏览器标准验证 `product_models` 等其它多记录集合 |
| 正式媒体 | 已有 23 条产品尺寸图候选，文件在 MinIO S3；均为 `draft/unpublished/pending_review`，没有已发布可选素材 | 部分完成，仍阻断页面替换 | 业务确认版权后完成审核发布，再做型号工程图到页面的媒体闭环 |
| 六页全量绑定 | 部分元素尚无逐项 `collection/itemId/fieldPath` 回读证据 | 未完成 | 建立元素清单并逐条建模、绑定、验收 |
| 发布工作流 | 草稿保存已有基础，审核、公开隔离、回退尚无完整角色验收 | 未完成 | 在内容绑定稳定后完成 |

以下说法目前不成立，后续不得作为验收结论：

1. “六个页面所有内容都已可视化编辑”。当前已完成多个真实字段样本，但仍有大量字段、正式媒体和发布流未验收。
2. “HTTP 200 说明 CMS 内容已读到”。`data: null`、缓存或 fallback 均可能返回 200；必须检查受保护 Directus 记录和发布状态。
3. “PSD fallback 可以当作正式可替换媒体”。没有 Directus 文件、MinIO 对象、用途、版权和替代文本的素材只能展示，不得进入正式媒体编辑闭环。

## 3. 目标架构与职责

```text
页面模板层（Nuxt 六个既有页面）
    -> 区块组件层（Banner、图文、产品列表、新闻列表、Gallery、RichText 等）
        -> Directus 数据层（页面、产品、新闻、媒体、版式配置、审核记录）
```

| 层 | 责任 | 不允许承担的责任 |
| --- | --- | --- |
| 页面模板层 | 保持既有视觉结构、路由、动画和响应式；声明区块位置 | 根据屏幕文案或数组下标推断保存目标 |
| 区块组件层 | 渲染 CMS 数据；提供稳定的可视化编辑绑定；限制可调范围 | 直接写数据库或暴露任意 CSS |
| Directus 数据层 | 保存内容、媒体、版式白名单、状态、审计和版本 | 用静态 fallback 伪造正式内容 |
| 编辑工作台 | 选择目标、编辑草稿、预览、保存、错误提示和发布流程 | 改写 Nuxt 页面结构 |

每个可编辑元素都必须提供稳定、可回读的绑定：

```json
{
  "sectionKey": "product-series",
  "collection": "product_series",
  "itemId": 1,
  "fieldPath": "name",
  "elementType": "text",
  "mediaRole": null,
  "placementKey": null
}
```

缺少真实 `collection`、`itemId` 或字段白名单的元素只能只读。禁止用显示文字、页面坐标、数组索引或 fallback 资源猜测写入目标。

## 4. 编辑体验与数据契约

### 4.1 工作台布局

- 顶部：页面/区块面包屑、选择/文字/媒体模式、撤销、重做、缩放、保存草稿、预览、审核状态。
- 左侧：只显示当前页面的业务区块和该区块中的记录列表；列表过长时搜索、分页或折叠，不把实际编辑表单挤入导航栏。
- 中央：真实 Nuxt iframe 画布。编辑模式点击元素只负责选中，必须阻止原跳转、展开、播放等交互；浏览模式保留原行为。
- 右侧：当前元素的字段、媒体、列表、文字样式、受控位置、绑定诊断和保存错误。切换页面、区块或记录必须清空旧选中态。
- 预览：编辑区与画布并排，不能覆盖输入控件。草稿变化应即时叠加；视频加载、结束、失败或浏览器自动播放限制不得阻塞定位和编辑。

### 4.2 可编辑范围

| 类别 | 可调项 | 限制 |
| --- | --- | --- |
| 文字 | 文案、字体、字号、字重、行高、颜色、对齐 | 字体和字号仅允许模板白名单；富文本必须安全过滤 |
| 图片/视频 | 文件、替代文本、标题、裁切焦点、适配方式、海报 | 先完成媒体治理；不得引用本地临时文件或 fallback 作为正式素材 |
| 受控位置 | 模板预设对齐、偏移、宽度、层级、显示开关 | 每个区块单独定义范围；不开放绝对自由拖拽 |
| 列表 | 新增、删除、排序、隐藏、分页策略 | 每条记录独立真实 ID；删除必须确认并可回退 |
| 链接/按钮 | 文案、图标、已审批的站内/站外链接 | 校验协议、目标和可访问性 |

### 4.3 内容状态

`draft -> in_review -> published -> archived` 为目标状态流。编辑者只可保存草稿和提交审核；审核者可通过或退回；发布者可发布、下线和从版本恢复。公开 Nuxt 请求只读已发布内容；受授权预览会话可叠加草稿。

## 5. 六页内容模型与工作台区块

| 页面 | 工作台区块 | CMS 管理内容 | 前台规则 |
| --- | --- | --- | --- |
| 网站主页 | 首页视频、三大理由、产品系列、横移图文、时间轴、页尾 | 视频/海报、文字、缩略图、图标、背景、年份里程碑、链接、页尾文案 | 时间轴按排序；视频异常不遮挡文字 |
| 产品展示 | 首屏、分类、产品系列、型号、卖点、参数尺寸、资料 | 名称、图片、说明、参数/单位、尺寸图、资料、排序 | 长列表按产品模板分页或筛选 |
| 先进制造 | 首屏、工艺画布、制造区域、核心设备 | 背景、节点图片/文字、连接标签、区域图文、设备标题、媒体库 | 核心设备库可多存，前台按模板展示 |
| 视频新闻 | 首屏、动态新闻、视频分享、详情 | 视频、标题、日期、封面、摘要、安全图文正文 | 新闻和视频每页 6 条，按业务日期倒序 |
| 关于瑞钧 | 品牌故事、共用时间轴、厂区、资质、合作品牌、客户 | 背景、文案、里程碑、图库、证书、标题、品牌/客户图片 | 资质在正式媒体到位前只读 |
| 服务支持 | 首屏、瑞钧支持、服务入口、直属办事处 | 背景、按钮/图标/说明、地区、门店、负责人、电话、地址 | 联系方式须有格式校验和明确隐私授权 |

“可无限存放”只指 Directus 数据和素材库不受前台显示数量限制。前台每个区块必须明确采用分页、轮播、折叠或懒加载之一，不能因为数据增加而破坏当前页面。

## 6. 继续执行路线图

### P0-A 工作台可靠性与防串写

目标：任何视觉选中都能准确指向当前记录，不遮挡编辑区，也不触发官网原交互。

1. 真实浏览器验证：选中首页字段后切换到 `高级设置 -> 型号与参数`，旧的 `pages` 或 `product_series` 属性面板必须消失。
2. 在新型号画布中选中真实模型文字，面板必须显示正确 `product_models/itemId/fieldPath`；若型号与产品系列错配，先修渲染数据映射，不允许保存。
3. 覆盖画布点击、双击、选择/文字/媒体模式、跨集合点击、切页、切区块、切记录和 iframe 重载。
4. 验收失败时必须保留本地草稿并给出可操作错误，不能静默写到旧记录。

完成标准：自动测试、扩展构建、真实浏览器验证均通过；至少一次记录切换后重新选择并受保护回读确认正确记录。

### P0-B 绑定清单与文字字段闭环

目标：先把每页真正可见的文字和按钮文案建立完整清单，再逐项接入。

1. 为六页逐区块列出可见元素、页面位置、目标集合、字段、当前来源、是否正式数据、编辑模式和验收状态。
2. 优先完成 `product_models`、先进制造、首页、服务支持各一条真实文字闭环；随后按清单推进，不按“页面看起来能点击”宣称完成。
3. 每项执行：画布选中 -> 即时预览 -> 保存草稿 -> 受保护 Directus 回读 -> 工作台重载一致 -> 恢复测试值。
4. 不能建立真实绑定的元素标记为“待建模/只读”，并在工作台显示原因。

完成标准：清单中每条都有字段映射和验收记录；没有“正文与官网实际内容不一致”但无法追踪来源的条目。

### P0-C 正式媒体、资质和位置/样式闭环

前置输入：业务方提供可使用的正式图片/视频、版权或授权、页面用途、替代文本、桌面/移动裁切焦点和文件规格。

1. 导入一组正式媒体，验证 Directus 文件记录、`media_assets`、MinIO 对象、用途、版权、替代文本和发布状态。
2. 将一条正式图片或视频绑定到真实页面，验证替换、即时预览、保存、受保护回读、刷新和恢复。
3. 为文字样式和受控位置建立区块白名单。每次调整必须在 1440x900、1920x1080、3840x2160 保持原版式；不符合则拒绝保存或回退。
4. 正式证书素材到位后，再完成 `qualifications` 替换闭环；在此之前 PSD 证书仅只读显示。

完成标准：`media_assets` 不为零，并至少有一条正式媒体从上传到页面替换的完整证据。

### P1-A 列表、新闻、视频与产品图库

1. 新闻：标题、日期、封面、摘要、图文详情来自同一记录，可新增、编辑、隐藏、排序和打开详情。
2. 视频：上传视频文件与标题、日期；自动抽取首帧作为默认封面，失败时允许人工替换海报并显示错误状态。
3. 新闻和视频分享每页固定 6 条，按业务日期倒序，支持分页。
4. 产品参数、尺寸图、核心设备和品牌/客户图库支持独立记录的增删排序；前台按所属区块策略展示。

### P1-B 审核、发布、回退与运营保障

1. 用真实编辑、审核、发布角色验证所有状态转换和权限边界。
2. 公开端不读取草稿；预览端可读取当前授权草稿。验证时不得把 HTTP 200 或缓存命中当作内容证据。
3. 记录每次发布、下线和恢复的操作者、时间、变更内容和版本来源。
4. 弱网或保存失败时保留本地草稿，支持重试；切换未保存记录时要求确认。

## 7. 验收、测试与发布门槛

每个切片都必须遵循以下顺序：

```text
失败测试 -> 最小实现 -> 定向测试 -> 全量测试 -> 扩展/生产构建
-> 真实 PC 浏览器 -> 受保护 Directus 回读 -> 刷新一致性
-> 恢复测试值 -> 更新本 PRD 的执行记录
```

发布就绪的必要条件：

1. 六页清单中的承诺元素均有真实绑定，或被明确标记为只读/延期且获业务确认。
2. 文字、正式媒体、受控位置/样式、列表、错误恢复和审核发布均有对应验收证据。
3. PC `1440x900`、`1920x1080`、`3840x2160` 下工作台和官网不覆盖、不溢出、不改变既有布局；手机 `390x844` 仅验证公开端无横向溢出、重叠和不可读内容。
4. 每个临时测试值均已恢复；没有静态 fallback、缓存或 `data: null` 被当作真实读取的证据。

## 8. 媒体交付规格

| 用途 | 建议规格 | 必填元数据 |
| --- | --- | --- |
| 首屏图/视频 | 图片至少 2560x1440；MP4 H.264 1920x1080、15-60 秒 | 海报、替代文本、桌面/移动裁切焦点、版权 |
| 产品/设备图 | 1:1 或 4:3，至少 1600x1200 | 名称、替代文本、`contain/cover` 适配方式 |
| 新闻封面 | 16:9，至少 1600x900 | 标题、业务日期、替代文本、焦点 |
| 证书/尺寸图 | 原比例，长边至少 2000px | 名称、来源、编号/版本、有效期（适用） |
| 图标/标志 | SVG 优先；位图至少 512x512 | 名称、用途、浅深色适配、版权 |

## 9. 需要业务确认的输入

以下不是技术可自行猜测的内容；缺失时对应功能只能停留在“待建模/只读”：

1. 正式图片、视频、证书、图标的交付清单，以及每项版权/授权、用途和替代文本。
2. 需要删除的演示资讯及保留/替换规则。
3. 每个区块可调整的样式和位置范围，特别是是否允许改字号、偏移、宽度、层级和移动端显示顺序。
4. 新闻业务日期的时区与同日排序规则。
5. 编辑、审核、发布是否必须由不同账号完成。

## 10. 当前执行记录

- 2026-08-31：先进制造“工艺流程画布”完成真实 PC 的可视化列表闭环。工作台从“先进制造 -> 工艺流程画布”新增节点，填写标题、正文、连接说明和左上锚点；实时预览立即显示节点。直接在 iframe 点击节点标题后，属性面板精确命中 `pages · items.0.title`，通过属性面板将标题改为“画布选中验收节点-已修改”，画布同步更新。保存草稿后认证 Directus 回读节点标题、正文、连接说明和 `top-left`；重载工作台后四项仍一致，并再次由 iframe 点击选中相同字段。最后删除节点、保存并回读确认 `hasTestNode=false`、`itemCount=0`，未留下测试内容。该项不将节点媒体替换计为完成。

- 2026-08-31：先进制造页压底“国内邮箱”完成跨集合真实 PC 可逆闭环。iframe 文字节点准确绑定 `site_settings/1.contacts.domestic_email`，点击后属性面板显示 `site_settings · contacts.domestic_email`。临时邮箱立即进入画布；保存草稿后认证回读 `site_settings/1.contacts.domestic_email=cms-e2e@ruijun.example`，同时 `pages/8.sections[process].items` 仍为 `0`。重载后画布仍显示临时邮箱并可重新选中，随后从同一属性面板恢复 `ksrjjx@126.com`、保存并确认画布同步。该项不包含页尾图标、Logo 或其它页尾文字的独立媒体验收。

- 2026-08-31：产品展示 `product_models/17.configuration.features.0.label` 已完成真实 PC 可逆闭环。工作台在“产品展示 -> 产品型号、参数与尺寸图”选中 FL1610、打开实时预览并点击 iframe 内“\`五轴数控\`”；属性面板精确命中 `product_models · configuration.features.0.label`。临时修改立即反映到画布，保存后 `PATCH /items/product_models/17` 返回 `200`，工作台重载后测试值仍在表单、画布和属性面板中显示；最后从同一路径恢复原文并重新加载确认。该项只代表可见特点标题文字，图片、空说明和工程图仍受媒体治理与逐项绑定约束。
- 2026-09-01：继续完成同一型号第二项能力标题 `product_models/17.configuration.features.1.label` 的真实 PC 可逆闭环。工作台选择 FL1610 后在 iframe 点击“\`四轴螺距补偿\`”，属性面板精确显示该字段路径；临时改为“\`四轴螺距补偿-画布验收\`”后即时同步，点击“保存型号信息”成功，工作台重载仍保持测试值，随后恢复原文并再次保存。相邻能力项未被修改。本项不代表能力图片、说明或工程图已完成。

- 2026-08-31：服务支持“瑞钧支持”标题 `pages/3.sections[id=support].title` 已完成修复后的真实 PC 可逆闭环。工作台从“服务支持 -> 瑞钧支持”打开实时预览，iframe 点击标题后属性面板命中 `pages · title`；临时改为“瑞钧支持-画布验收20260831”后，表单、属性面板和 iframe 同步更新。点击“保存草稿”后，认证 Directus 回读 `HTTP 200 / status=draft / supportTitle=瑞钧支持-画布验收20260831`；点击“重新加载”后同一工作台和 iframe 仍为测试值。随后从属性面板恢复“瑞钧支持”并保存，认证回读 `restored=true`，无测试数据残留。截图：`output/playwright/service-support-title-save-reload-20260831.png` 与 `output/playwright/service-support-title-restored-20260831.png`。本项仅覆盖标题文字的选中、保存与重载，不包括正文、搜索控件、静态图标或图片替换。

- 2026-08-31：修复服务支持画布首次打开后“文字有字段路径却无法点击”的运行时接管缺口。页面页头/页脚组件可能先收到预览消息，随后服务页面组件接管共享事件桥；旧实现只监听后续 DOM 变化，已渲染的标题没有重新获得 `data-cms-preview-editable`。现接管时立即装饰已有字段，再继续监听 DOM 变化。先新增失败测试，再通过 `website/test/cms-live-preview.test.mjs` 的 `71/71` 定向回归。真实 Chrome 路径为“服务支持 -> 瑞钧支持 -> 打开实时预览”，点击 iframe 内“瑞钧支持”后右侧属性面板显示 `pages · title`，可编辑文字、偏移、字号、字重、行高和颜色；截图：`output/playwright/service-support-title-canvas-selection-fixed-20260831.png`。本项只证明画布选中链路恢复，不替代该字段已有的保存/重载验收，也不改变 Nuxt 公开布局。

- 2026-09-01：修复新闻详情画布把文章分类当作自由文本的问题。`articles.category` 是控制新闻/视频两种内容分支的枚举值，任意文本会导致前台筛选和媒体要求失真。先新增失败测试，再将选中 `articles · category` 时的右侧“文字内容”框替换为“内容类型”下拉，仅允许 `news`（动态新闻）与 `video`（视频分享），提交路径也拒绝未知值。扩展重建、重启 Directus 后，真实 Chrome 从“视频新闻 -> 动态新闻内容”点击详情画布中的 `news`，属性面板显示受控下拉；临时切换 `video` 会即时切到视频媒体表单，切回 `news` 后无未保存修改，未写入测试数据。截图：`output/playwright/news-category-controlled-selector-20260901.png`。当前没有已审核视频素材，因此不把跨类型保存计为完成，也不绕过媒体治理。

- 2026-09-01：产品尺寸图完成一条内部草稿媒体的真实 PC 可逆闭环。`media_assets/27` 是 FL1610 尺寸参数图候选，状态始终为 `draft/unpublished`；先由已有的 API/预览验证确认其可读且能完整恢复。工作台在“产品展示 -> 产品型号、参数与尺寸图”选择 FL1610，新增尺寸图并选择该候选素材，iframe 即时显示工程图；点击图片后属性面板精确显示 `product_models · configuration.drawings.0.media_asset_id` 及“媒体替换”下拉。从画布保存草稿后认证 Directus 回读 `media_asset_id=27`；完整重载、重新打开预览和再次点击图片仍命中同一路径。最后删除测试尺寸图、保存，并认证回读 `drawing=null`，页面恢复原工程视图。截图：`output/playwright/product-FL1610-draft-drawing-reload-20260901.png`。这不是正式媒体发布或公开替换，版权、用途、替代文本确认和审核发布仍是必要前置条件。

### 已完成且可复核

- `milestones/1.year`、`milestones/1.event`、`milestones/1.evidence`、`articles/10.title`、`product_series/1.name` 已完成真实数据闭环：画布选中、即时预览、保存草稿、受保护 Directus 回读、工作台刷新和原值恢复。
- 产品卡片在编辑模式下已阻止原 `openProduct` 展开；选择/文字模式点封面会回退到名称绑定，媒体模式选择 `cover_asset`。
- 实时预览默认关闭，编辑者显式点击“打开实时预览”后才进入画布模式，避免初次进入工作台时画布遮挡型号或表单操作区。
- CMS 全量测试、网站全量测试、Directus 扩展构建和 Nuxt 生产构建已通过；这些只证明当前覆盖范围，不能替代浏览器与回读验收。
- 2026-08-28：首页“选型咨询”标题 `pages/1.sections[product-task].title` 已完成字段级位置与样式闭环：真实 PC 画布选中标题后，临时设置横向偏移 `6%`、字号 `48px`，iframe 立即更新；保存后认证 Directus 回读只出现 `field_presentation.title`，未写入 `body`；完整重载工作台并重新选择标题后设置仍为 `6/48`。最终恢复验收前的完整 `sections` 数据并确认 `field_presentation.title/body` 均不存在。此项不代表首页其它字段或六页均已支持独立位置/样式。
- 2026-08-31：首页“三大理由”补齐真实可见节点的字段级位置/文字样式绑定：总标题 `why-ruijun.title`、三个首屏理由的 `introTitle/introDetail`、横移导航 `shortTitle`、设备横移正文 `body` 与图片横移标题 `title` 分别使用精确 `field_presentation` 路径。`cms/scripts/verify-homepage-reason-intro-title-presentation-preview.mjs` 临时写入 `pages/1.sections[performance].introTitle` 的 `3% / 28px / 1.4 / #123456`，认证 Directus 回读、预览会话和 Nuxt 首页 HTML 均确认渲染；相邻 `advanced-manufacturing` 未变化，最后自动恢复。此为自动化 API/预览闭环，实际画布点击和属性面板保存仍需人工浏览器验收。

### 下一项执行

执行 `P0-B`：继续按六页可见元素清单完成真实字段闭环，并逐个验证其它多记录集合。正式媒体未到位前，不跳过媒体治理，不把 PSD/static fallback 改成可编辑正式内容。

### 2026-08-31：工作台区块卡片入口不再静默失效

- 问题复现：在 `1440x1000` 的真实 Chrome 中，从“服务支持”进入区块总览后，点击中央“02 瑞钧支持”卡片没有进入表单，导致“打开实时预览”持续禁用。该现象不能归因于 Nuxt 或 iframe，因为表单目标未被工作台选中。
- TDD：先在 `cms/test/content-editor-workbench-module.test.mjs` 增加失败断言，要求官网区块入口在内存页列表中没有对应页面时，必须重新加载一次列表；仍找不到时显示可操作错误，禁止静默 `return`。
- 最小实现：`openSiteAreaEntry()` 改为异步入口，首次缺页调用既有 `loadPages()` 后重新解析当前官网栏目；第二次仍缺页显示“未找到对应页面草稿，请重新加载后再试”。不变更 Nuxt 模板、页面数据、PSD 几何、路由或动画。
- 运行时验收：重建扩展并只重启 Directus 后，真实 Chrome 按“服务支持 -> 中央瑞钧支持卡片”进入编辑表单，读取标题、搜索提示和按钮文字；“打开实时预览”由禁用变为可用。截图：`output/playwright/service-support-card-opens-form.png`。定向回归：CMS 工作台 `42/42`、官网实时预览 `70/70` 通过。
- 边界：本项修复的是工作台入口与可用性，不将服务支持全部字段、媒体替换或发布流程计为完成。标题字段已有画布选择证据；本轮完整“保存后重载再恢复”的自动浏览器脚本在重载阶段超出执行窗口，且已确认 Directus 标题恢复为原值，因此不新增该闭环的完成声明。

### 2026-08-31：首页三大特点合并编辑窗口

- 问题核查：`pages/1.sections` 已有 `why-ruijun`、`performance`、`advanced-manufacturing`、`industry-leadership` 四个真实记录，但此前从“网站主页 -> 三大特点”进入后，工作台只展示总标题区块，编辑者无法在同一业务窗口顺序管理三条理由。这与“页面 -> 业务区块”的导航约束及同一窗口编辑要求不一致。
- TDD：先在 `cms/test/content-editor-workbench-module.test.mjs` 写入失败断言，要求该入口返回上述四个真实 section ID；最小实现以 `pageSectionGroupKeys['home:why-ruijun']` 约束组合展示，其他区块仍只显示自身。不写数据库、不改变 Nuxt 页面 DOM、CSS、动画或公开内容。
- 运行时验收：扩展重建并仅重启 Directus 后，真实 Chrome 工作台从“网站主页 -> 三大特点”读取到四张连续编辑卡片；DOM `data-section-key` 顺序为 `why-ruijun, performance, advanced-manufacturing, industry-leadership`。打开实时预览，点击官网首屏“增效降损”后右侧属性面板准确显示 `pages · introTitle`，截图为 `cms/.playwright-cli/page-2026-08-31T11-17-45-373Z.png`。本项只改善工作台编辑分组；未修改含 `requires_claim_review` 的宣传文案，也不将静态图片计为媒体可替换。

### 2026-08-31：产品三大指标合并编辑窗口

- 问题核查：产品页 `pages/7.sections` 的 `categories`、`proof-efficiency`、`proof-years`、`proof-champion` 均为真实 Directus section；产品展示的“三大指标”入口原先只显示 `categories`，使三个官网实际指标不能在同一业务窗口内管理。
- TDD：先增加失败断言，限定该入口只能分组显示 `categories + 3 个 proof`；在既有 `pageSectionGroupKeys` 白名单中增加 `product:categories`，不涉及产品系列、型号、参数、分页或 Nuxt 模板。
- 运行时验收：扩展重建、Directus 重启后，真实 Chrome 从“产品展示 -> 三大指标”得到 `categories, proof-efficiency, proof-years, proof-champion` 四个 `data-section-key`，三条指标的标题、说明、数值和单位在同一表单中连续显示。实时官网画布点击首个红色 `50%`，右侧属性面板精确显示 `pages · value`，对应 `proof-efficiency`，截图为 `cms/.playwright-cli/page-2026-08-31T11-22-58-429Z.png`。本次未保存或变更带审核标记的宣传数据，不将此项误计为文案审核或发布完成。

### 2026-08-31：服务支持珠三角区门店地址人工画布闭环

- 目标字段：`pages/3.sections[office-directory].items.2.offices.0.address`，官网显示为“东莞长安店：东莞市长安镇振安东路768号”。同地区第一家门店负责人为“孙金诚经理”，第二家门店为“广州佛山店：佛山市顺德区顺联机械城4座4号 / 李亮经理”。
- 真实 PC 验收：从“服务支持 -> 国内直属办事处”打开与官网同源的实时 iframe，直接点击该地址，右侧属性面板精确显示 `pages · items.2.offices.0.address`。临时输入“东莞长安店：画布验收 20260831”后 iframe 立即同步；点击画布工具栏“保存草稿”后认证 Directus 回读该地址为测试值，负责人和第二家门店完整保持原值。完整重载工作台并沿相同路径重新打开表单后仍读取测试值。
- 恢复与回归：通过同一工作台字段恢复原地址、保存并认证回读，页面最终为 `draft/unpublished`，负责人和相邻门店均保持原值。`cms/test/service-office-third-region-contact-preview.test.mjs`、工作台和画布目标回归共 `46/46` 通过；截图为 `cms/.playwright-cli/page-2026-08-31T11-28-49-293Z.png`。本项不包含地区图片、地图或其它未治理媒体的替换能力。

### 2026-08-31 工艺流程画布验收

- 先进制造“工艺流程画布”已完成一个可逆的运行时闭环：工作台新增节点使用受控默认结构（标题、正文、连接说明、画布锚点、排序及稳定媒体角色），保存目标为 `pages/8.sections[process].items`。验收脚本 `cms/scripts/verify-manufacturing-process-node-preview.mjs` 会创建临时节点、认证 Directus 回读、签发一次性草稿预览令牌、通过 Nuxt 预览会话确认节点和 `process` 画布选择器，再从最新页面快照移除测试节点并回读确认清理。运行结果为 `pages/8/process`、`restored=true`；没有将测试节点发布到公开官网。
- 2026-08-31：工艺流程节点内的标题、正文和连接说明现各自使用 `items.{index}.field_presentation.{title|label|body|description|connection_label}`，可在画布独立调整受控位置、字号、字重、行高和颜色。标题运行时验证临时写入 `3% / 32px / 1.4 / #123456`，认证 Directus 回读、预览会话与受保护 Nuxt HTML 均保留并渲染该配置，测试节点随后删除。节点整体锚点和原始动画不变；不开放任意 CSS，也不把未托管节点媒体计为可替换完成。
- 定向回归覆盖 CMS 工作台、工艺节点默认值、Nuxt 工艺画布绑定和草稿预览净化，共 `118` 项通过。本项证明节点数据可进入受保护 Nuxt 预览，但不代表正式节点图片或视频已经可替换：当时尚无已发布的制造素材，静态 PSD 素材继续只读。
- 先进制造现将既有 PSD 文字改为字段级 presentation：每个文本都携带对应的 `field_presentation.<field>` 保存路径，并只读取自身的受控偏移、字号、字重、行高和颜色；默认配置为空时继续使用原 PSD 坐标、字号、字重和行高。`cms/scripts/verify-manufacturing-inspection-title-preview.mjs` 已升级为可逆验证：临时写入“精密检测”标题和 `3% / 40px / 1.4 / #123456`，认证 Directus 回读、草稿预览会话和 Nuxt `/manufacturing?cmsPreview=1` HTML 均确认该字段与路径实际渲染；结束时从最新服务器快照恢复原文及完整原 presentation。最新结果：`pages/8.sections[whole-machine-validation].field_presentation.title`、`pages/8/whole-machine-validation`、`restored=true`。2026-08-31 已在真实 PC 画布复验“临时文字即时同步 -> 保存草稿 -> 完整重载 -> 恢复原文 -> 再次重载”，属性面板始终命中 `pages · title`；检测设备图片仍为未托管静态素材，不计入媒体替换完成。
- 服务支持“国内直属办事处”的第三个地区标题已补充防串写的可逆运行时验证：`cms/scripts/verify-service-office-third-region-preview.mjs` 临时写入 `pages/3.sections[office-directory].items[2].title`，认证 Directus 回读后签发草稿预览令牌，并确认 Nuxt `/service?cmsPreview=1` 的 `office-directory` 区域实际渲染标记；同次验证断言 `items[0]`、`items[1]` 标题未发生变化，最后从最新服务器快照恢复原文并回读确认。最新结果：`pages/3/office-directory`、`restored=true`。这属于自动化 API/预览证据，管理员仍需完成真实画布点击、属性面板保存、刷新和恢复的人机验收。
- 产品展示“FL1610”首项能力标题已补充跨型号防串写的可逆运行时验证：`cms/scripts/verify-product-model-third-record-preview.mjs` 临时写入 `product_models/17.configuration.features.0.label`，认证 Directus 回读后签发以该型号为主记录的草稿预览令牌，并确认 Nuxt `/product/fl1610?cmsPreview=1` 的产品详情画布实际渲染该标记及精确字段绑定；同次验证断言 `product_models/15`、`product_models/16` 的同路径能力标题未改变，最后恢复 17 号型号的完整 `configuration` 并回读确认。最新结果：`product_models/17/product-details`、`restored=true`。这属于自动化 API/预览证据，管理员仍需完成真实画布点击、属性面板保存、刷新和恢复的人机验收。
- 2026-08-31：产品型号详情的 `model_code` 已增加独立的 `product_models.presentation.field_presentation.model_code` 受控位置与文字样式通道。该字段只接受既有白名单内的偏移、字号、字重、行高和颜色；Nuxt 默认不读取任何配置时保持原 PSD 布局。已执行 `cms/scripts/verify-product-model-third-record-preview.mjs`：临时写入 FL1610 首项能力文字，同时写入型号代码 `4% / -2% / 24px / 600 / 1.4 / #123456`，认证 Directus 回读、一次性预览令牌会话及 Nuxt 产品详情 HTML 均确认同一字段与 CSS 变量实际渲染，15、16 号型号未变，结束后恢复完整 `configuration` 与 `presentation`。此项是自动化 API/预览闭环，尚不替代管理员的画布点击、保存与重载人机验收。
- 2026-08-31：产品详情第二个可见能力说明已补充可逆验证。`cms/scripts/verify-product-model-auto-detail-preview.mjs` 临时写入 `product_models/1.configuration.features.1.detail` 并保存其 `features_1_detail` 的受控样式与位置；Directus 回读、草稿预览会话及 Nuxt 产品详情 HTML 均确认标记、字段路径与 CSS 变量实际渲染，同型号首项说明及 `product_models/2` 对应说明保持原值，最后恢复完整 `configuration`。最新结果：`product_models/1/product-details`、`restored=true`。该 API/预览证据不替代工作台画布选择、属性面板保存、刷新与恢复的人机验收。
- 2026-08-31：上述自动穿丝型号第二项说明已完成真实 PC 画布验收。工作台选择 `FR400XS (Auto)` 后，画布点击 `configuration.features.1.detail` 准确打开 `product_models` 属性面板；临时文本即时进入 iframe，点击“保存草稿”后完整工作台重载仍保留，最后恢复原文并保存。认证 Directus 读取确认 `product_models/1.configuration.features.1.detail` 已恢复，未留下验收标记。
- 2026-08-31：修复服务支持“国内直属办事处”在实时画布只显示总标题、不显示地区与门店的缺陷。根因是页面草稿预览的受控净化器遗漏 `items[].offices`、地图角色与门店展示字段，Nuxt 因无门店记录过滤掉全部地区。现仅允许区域地图角色及门店 `source_key/city/address/manager/phone` 进入预览，内部字段继续剔除；新增失败测试后 `website/test/cms-live-preview.test.mjs` 通过。真实 PC 画布已显示全部 10 个地区，点击“珠三角区”精确命中 `pages · items.2.title`；临时文字即时同步、保存草稿、认证 Directus 回读、完整工作台重载、恢复原文和再次重载均完成，页面保持 `draft/unpublished`。静态地区图仍未纳入受治理媒体替换。
- 2026-08-31：同一节点的位置与文字样式也完成真实 PC 闭环。属性面板临时写入横向偏移 `3%`、字号 `18px`、字重 `600`、行高 `1.5`、颜色 `#123456`；iframe 计算样式、草稿保存、认证 Directus 回读和工作台重载均一致。验收后精确删除该节点的临时 presentation，画布回到默认 `11px / 400 / 1.6 / #4f5357 / 无偏移`，不影响 Nuxt 模板或相邻节点。
- 关于瑞钧与网站主页共用的 2006 年里程碑事件已补充跨页面、跨记录防串写的可逆运行时验证：`cms/scripts/verify-milestone-third-event-shared-preview.mjs` 临时写入 `milestones/3.event`，认证 Directus 回读后签发该里程碑的草稿预览令牌，并确认 Nuxt `/about?cmsPreview=1` 与 `/?cmsPreview=1` 都实际渲染相同标记；同次验证断言 `milestones/1`、`milestones/2` 事件未改变，最后恢复第 3 条事件并回读确认。最新结果：`milestones/3/history`、`sharedPages=[about,home]`、`restored=true`。这属于自动化 API/预览证据，管理员仍需完成真实画布点击、属性面板保存、刷新和恢复的人机验收。
- 服务支持“珠三角区”首门店的地址与负责人已补充双字段、同区域防串写的可逆运行时验证：`cms/scripts/verify-service-office-third-region-contact-preview.mjs` 临时写入 `pages/3.sections[office-directory].items[2].offices[0].address` 和 `.manager`，认证 Directus 回读后确认 Nuxt `/service?cmsPreview=1` 的办事处画布实际渲染两个标记；同次验证断言该区域第二家门店 `items[2].offices[1]` 未改变，最后恢复两个字段并回读确认。最新结果：`pages/3/office-directory`、`restored=true`。这属于自动化 API/预览证据，管理员仍需完成真实画布点击、属性面板保存、刷新和恢复的人机验收。

### 2026-08-29 本轮实现记录

- 产品型号卖点的画布属性面板新增受控“行高”和“文字颜色”控件，并与既有字号、字重使用同一字段级保存路径：`product_models.configuration.field_presentation.features_{index}_{label|detail|note}.text_style`。行高只接受 `1-2.2`，颜色只接受 `#RRGGBB`；非法输入不会写入草稿，未开放任意 CSS。
- 已按 TDD 完成失败测试、最小实现、CMS 定向/全量测试、网站全量测试、Directus 扩展构建和 Directus 重启。Nuxt 产品读取器回归确认这两个字段会经过受控净化传至页面画布。
- 已完成可逆运行验收：临时写入 `product_models/16.configuration.field_presentation.features_0_label.text_style` 的行高 `1.6`、颜色 `#123456` 后，认证 Directus 回读一致；受保护 Nuxt 草稿预览实际渲染对应 CSS 变量；最后完整恢复原 `configuration` 并认证回读，记录保持 `draft/unpublished`。
- 2026-08-29 补充人机验收：在工作台“高级设置 -> 型号与参数”切换至 `FL1390`，从真实画布选择 `configuration.features.0.label` 后，属性面板实际录入行高 `1.6`、颜色 `#123456` 并点击“保存型号信息”。iframe 计算样式为 `32px`、`rgb(18, 52, 86)`；认证 Directus 回读仅出现受控 `features_0_label.text_style`，完整工作台重载后仍保持。随后删除测试字段并重载，恢复为默认 `27px`、`rgb(7, 1, 146)`。再切换至 `FL1180`，旧属性面板立即清空；重新选择同名卖点的绑定明确为 `product_models/15`，未保留 16 号记录。

### 2026-08-27 补充执行记录

- 先进制造页审计发现 `pages/8` 的部分可见 PSD 文案来自静态回退，而对应页面字段为空，导致画布文字和属性栏初值不一致。已以失败测试驱动受控回填：首屏工艺标题与产能说明使用独立字段，不复用移动端标题/正文；区域说明和详情回填到其已有字段。
- 回填仅发生在未初始化的草稿字段；回填标记确保用户之后主动清空不会被再次覆盖。受保护 Directus 回读、Nuxt 预览响应和定向测试均已验证；各字段的人机画布保存闭环仍须逐条完成，不因本次数据一致性修复而提前验收。
- 真实浏览器发现 PC 画布被旧规则压入移动端断点，现已修正为始终保留所选设备 viewport 并在 CMS 内滚动。制造页 `precision-machining.description` 已完成选中、即时预览、保存、认证回读、整页重载和原值恢复闭环；后续继续其他字段，不能将该样本扩展为全页已验收。
- 视频新闻首屏 `pages/9.sections[hero].body` 已完成真实 PC 画布选中、即时预览、保存草稿、认证 Directus 回读、完整工作台重载和原值恢复闭环。该页 `hero.title` 目前只被视频的无障碍标签使用、未在画面中渲染，必须保持为非可视化编辑字段；后续继续验证可见的 `hero.label` 和其他页面区块，不能将这一条扩展为整页已验收。
- 视频新闻首屏 `pages/9.sections[hero].label` 已完成同一闭环；修复了可视化桥的锚点元素遗漏，受控字段路径的 `<a>` 现在会按按钮类型进入画布选择。真实验收确认编辑模式点击 CTA 不会触发官网锚点跳转。该共用修复不开放任意链接编辑，也不改变普通官网浏览行为。
- 视频新闻 `pages/9.sections[video-sharing].description` 已完成空状态文字闭环。该字段只覆盖当前无正式视频记录时官网实际显示的提示文案；不得把此项当作视频上传、首帧封面或视频列表发布的完成证据。
- 视频新闻 `pages/9.sections[video-sharing].title` 已完成独立闭环，并确认其不会串写空状态 `description`。视频分享区的可见静态文字现有 `title/description` 两个字段均有真实画布保存证据；素材与记录级字段仍按媒体治理前置条件等待验收。
- 服务支持首屏 `pages/3.sections[hero].title` 已完成真实 PC 画布选中、即时预览、保存草稿、认证 Directus 回读、完整工作台重载和原值恢复闭环。该标题的内嵌强调文字仍独立绑定 `description`，本次没有将其或其它首屏文案提前计为完成。
- 服务支持首屏 `pages/3.sections[hero].description` 已完成独立闭环。真实浏览器暴露并修复了画布桥接遗漏 `<em>` 标签的问题；已有受控字段路径的强调文字现在可被精确选中，仍沿用既有安全校验与页面版式，不开放任意富文本编辑。
- 服务支持首屏 `pages/3.sections[hero].body` 已完成独立闭环，确认其作为标题组合外的说明段落可被准确选中、保存和恢复，不串写 `title/description`。首屏的三条说明和 CTA 仍需逐字段验证。
- 服务支持首屏三条说明 `pages/3.sections[hero].items.0.label`、`items.1.label`、`items.2.label` 已完成真实 PC 画布闭环：画布可见定位文字分别精确选中三条重复内容，临时值即时显示；每条保存草稿后认证 Directus 回读、完整工作台重载均一致，并分别恢复为原文。嵌套路径测试确认第一条保存不会串写第二、第三条说明。
- 服务支持首屏 CTA `pages/3.sections[hero].label` 已完成真实 PC 画布闭环：按钮可选中、即时同步、保存草稿、认证 Directus 回读、完整工作台重载和原值恢复均已验证。验收同时修复静态背景容器对内部可编辑 CTA 传播 `aria-disabled` 的问题：背景仍只读，但具有真实字段绑定的子元素不再被错误禁用；普通官网行为与静态媒体替换限制不变。
- 服务支持“瑞钧支持”区块正文 `pages/3.sections[support].body` 与搜索 CTA `label` 已分别完成真实 PC 画布闭环：正文和原生表单提交按钮均可精确选中，编辑模式点击不触发原官网交互；即时同步、草稿保存、认证 Directus 回读、完整工作台重载和原值恢复均已验证。
- 服务支持搜索框说明 `pages/3.sections[support].description` 原先虽在官网 placeholder 中显示，却没有画布字段绑定；现已按失败测试补齐，并将受绑定的 `input/textarea` 纳入编辑桥候选。真实 PC 画布点击输入框可选中说明字段，临时 placeholder 立即更新；保存、认证回读、完整工作台重载与原值恢复均通过，编辑模式不会提交搜索表单。
- 服务支持型号卡片首项 `pages/3.sections[support-models].items.0.label` 与服务入口首项 `pages/3.sections[support-actions].items.0.title` 已分别完成真实 PC 画布闭环。两项均属于可点击重复卡片：画布选中不会触发原型号选择或服务入口动作，临时值即时显示、保存后认证回读、完整工作台重载和原值恢复均已验证。卡片图标仍为未托管媒体，保持只读。
- 服务支持第二张型号卡片 `pages/3.sections[support-models].items.1.label` 与第二个服务入口 `pages/3.sections[support-actions].items.1.title` 已完成真实 PC 画布闭环，用于验证嵌套重复内容不是只首项可编辑。画布分别选中“FR-XS(auto)”和“保修状态验核”，属性栏准确显示对应 `items.1` 路径；临时值即时进入 iframe，保存后认证 Directus 回读同一页面区块的第二项，随后恢复原文、再次保存。完整重载工作台并重新连接实时画布后，两项仍可从正确卡片选择并返回恢复值。图标仍为未托管媒体，不包含替换验收。
- 服务支持“国内直属办事处”入口原先错误进入独立 `service_locations` 管理，实际官网却优先读取 `pages/3.sections[office-directory].items`，两者不能互作保存证据。现已将该入口修正为页面区块画布，并单列“服务网点记录”用于独立记录管理。区域首项标题 `items.0.title` 已完成真实 PC 画布选中、即时同步、保存草稿、认证回读、完整工作台重载和原值恢复闭环。
- 国内直属办事处首项联系字段 `pages/3.sections[office-directory].items.0.offices.0.address`、`manager`、`phone` 已完成真实 PC 画布闭环。五层嵌套路径测试确认编辑地址不会改变负责人或电话；三项分别完成即时同步、保存草稿、认证 Directus 回读、完整工作台重载和原值恢复，记录始终保持草稿未发布。
- 国内直属办事处第二个区域标题 `pages/3.sections[office-directory].items.1.title`、首网点地址 `items.1.offices.0.address` 与负责人 `items.1.offices.0.manager` 已完成真实 PC 画布闭环，用于验证相邻地区的嵌套记录不是只首项可编辑。画布分别选中“长三角区”、“昆山店：昆山市城北路1255号”和“王晓枫经理”，属性栏准确显示 `items.1` 路径；负责人临时值即时进入 iframe，保存后认证 Directus 回读、完整工作台重载与原值恢复均通过，未发布测试内容。
- 关于瑞钧“公司简介”首项优势 `pages/2.sections[overview].items.0.label` 已完成真实 PC 画布闭环。失败测试先确认预览桥遗漏 `<li>`，修复后画布精确选中该列表项；临时预览、保存草稿、认证 Directus 回读、完整工作台重载和原值恢复均通过，记录始终保持 `draft/unpublished`。修复只将具有显式字段绑定的列表项纳入候选，不把父级列表开放为可编辑字段。
- 关于瑞钧“公司简介”区块其余可见文字已逐项完成真实 PC 画布闭环：`title`、`description` 与 `items.1.label` 至 `items.5.label` 分别完成即时预览、草稿保存、认证 Directus 回读、完整工作台重载和原值恢复。六条优势文案逐项保存，未出现相邻列表项串写；区块背景图仍为未托管静态素材，保持只读且不计为媒体替换完成。
- 关于瑞钧首屏可见文字 `pages/2.sections[hero].title`、`kicker`、`description` 已分别完成真实 PC 画布闭环。`kicker` 与 `description` 原始草稿值为空，官网显示默认值；填写后即时预览、保存、认证回读和重载均使用新值，恢复后字段重新为空且官网默认值正确恢复。首屏背景与机器前景仍为未托管静态媒体，保持只读。
- 关于瑞钧“品牌故事”可见文字 `pages/2.sections[brand-story].title`、`kicker`、`description`、`body` 已完成真实 PC 画布闭环。验收发现 Since/年份与正文存在覆盖层冲突，修复后仅编辑模式下将两个绑定数字提升为可命中，容器自身不拦截正文。正文原来伪绑定为 `body.0` 等不存在的路径，现改为唯一真实 `body` 字段，点击任意正文区域会打开整篇文本的属性编辑，双击不会把整篇正文误覆盖为单段；保存、认证回读、完整重载与原值恢复均通过。
- 关于瑞钧“发展历程”已分别完成区块可见英文标题 `pages/2.sections[history].kicker`、提示语 `label`，以及首条真实里程碑 `milestones/1.year`、`event`、`evidence` 的 PC 画布闭环。里程碑验收会先进入时间轴画布并选择可见记录；每个字段均完成即时预览、草稿保存、认证 Directus 回读、完整工作台重载与原值恢复，记录始终保持 `draft/unpublished`。`history.title` 在 PC 实际画面中被样式隐藏，因此不计入可视化编辑完成；时间轴背景和导航图标仍是未托管静态媒体，保持只读/待媒体。
- 本次浏览器验收还发现：从单条 `milestones/{id}` 发起草稿预览时，旧令牌只携带该条记录，导致预览中的其它时间轴记录消失。已按失败测试修复为受控相关集合预览，并让 Nuxt 以当前草稿覆盖同 ID 的列表项；实时画布现保留 6 条不同里程碑。该修复不向浏览器传递来源文件、审核日志或其它私有字段。
- 里程碑记录切换已完成真实 PC 验收：画布先选中 `milestones/1.event`，顶部下拉切换到 `milestones/2` 后旧属性面板立即清空；在同一 iframe 内重新选中 2003 事件，属性面板准确显示 `milestones · event` 和记录 2 原值。验证脚本随后重新加载工作台，仍完成记录 1 的即时预览、保存草稿、认证 Directus 回读与原值恢复。复杂时间轴的动画覆盖只在 CMS 编辑模式下按受控字段坐标兜底命中，不改变普通官网层级或可编辑字段白名单。其它集合的多记录切换仍待逐一验收，因此不把整个 P0-A 标记为完成。
- 2026-08-29：第二条里程碑 `milestones/2.event` 已完成独立恢复性闭环。工作台完整重载后仍显示此前的临时值；将其恢复为“创新中走丝（初代研发）”并保存草稿后，认证 Directus 回读、再次完整重载和表单值均一致，记录保持 `draft/unpublished`。本次只证明第二条记录不串写且可恢复，不代表其年份、佐证或其它里程碑已完成。

### 2026-08-28 补充执行记录

- 制造页实时预览修复：画布收到 `pages/8` 草稿后，`manufacturingPage` 虽已更新，但制造区块构造遗漏 `hero.processTitle`、`hero.outputText` 的受控 fallback 字段，解析器按白名单正确拒绝了这两个值，造成属性栏变化而 iframe 文案不刷新。先以失败测试复现“同一页新快照必须重建并保留两字段”，再将字段加入制造页最小白名单；没有放宽任意页面字段。真实 PC 验收分别修改 `processTitle` 与 `outputText`：画布即时刷新，保存后认证 Directus 回读，完整工作台重载后保持，最终恢复 `World’s top class` 后换行 `production process` 与“年产量可达10000台”，页面保持 `draft/unpublished`。

- 制造页 CNC 核心设备说明 `pages/8.sections[precision-machining].detail` 已完成真实 PC 画布闭环。首轮验证确认属性栏和保存均正确，但 iframe 在 900ms 后仍显示旧值；根因是预览安全净化白名单未声明已建模的 `detail`，接收时只剥离该字段而非保存链路故障。先以失败测试确认 `detail` 必须保留且内部字段仍被剥离，再将该受控字段加入最小预览白名单。修复后临时值立即出现在 iframe，保存后认证 Directus 回读和完整工作台重载均一致；最终恢复原三行说明并再次认证回读，页面保持 `draft/unpublished`。

- 制造页钣金核心设备说明 `pages/8.sections[sheet-metal].detail` 已完成独立真实 PC 画布闭环，用于复验上述 `detail` 白名单不是 CNC 特例。画布精确选中 `pages · detail` 后，临时值在 900ms 内同步到 iframe；保存后认证 Directus 回读、完整工作台重载均一致。最终恢复“智能核心设备：智能下料单元、智能成型单元、”后换行“智能焊接与连接单元、静电喷涂产线”，页面保持 `draft/unpublished`。

- 制造页“生产核心设备”标题 `pages/8.sections[core-equipment].title` 已完成恢复性真实 PC 闭环：先确认遗留临时验收值仍在草稿记录中，再从“先进制造 -> 生产核心设备”打开实时画布并选中可见标题，属性面板准确显示 `pages · title`。恢复原值“生产核心设备”后 iframe 立即同步；保存页面草稿后的认证 Directus 回读、完整工作台重载、重新进入该区块和实时画布均一致，页面保持 `draft/unpublished`。这项验证只证明该标题绑定与恢复链路，不代表设备图库已具备正式媒体替换能力。

- 制造页装配车间标题 `pages/8.sections[standardized-assembly].title` 已完成独立真实 PC 闭环：在“先进制造 -> 装配车间”的真实 iframe 中选中可见标题，属性面板准确显示 `pages · title` 且初值与画布一致。临时标题即时同步到画布；保存后认证 Directus 回读、完整工作台重载、重新选择同一画布文字均保持临时值。随后恢复“装配车间”，再次保存、认证回读和完整重载后的画布/属性面板均确认原值，页面保持 `draft/unpublished`。该项不涵盖静态展示图的媒体替换。

- 制造页装配车间正文 `pages/8.sections[standardized-assembly].description` 已完成恢复性真实 PC 闭环：临时文本在画布中即时同步，保存草稿后认证 Directus 回读和完整工作台重载均保持。随后恢复原四行正文“装配体系依托于恒温洁净的作业\n环境，部署了20条全链路制程产\n线。实现MES系统全流程智能化\n管控。”；再次完整重载并从“先进制造 -> 装配车间”打开实时画布后，点击正文准确命中 `pages · description`，属性面板与 iframe 均为恢复值，页面保持 `draft/unpublished`。该项不涵盖展示图片的媒体替换。

- 制造页精密检测正文 `pages/8.sections[whole-machine-validation].description` 已完成独立真实 PC 闭环：在“先进制造 -> 精密检测”的真实 iframe 中选中两行正文，属性面板准确显示 `pages · description`，初值与画布一致。临时值 `精密检测正文 TDD 20260828` 在 900ms 内同步到 iframe；保存草稿后认证 Directus 回读定位到 `sections.5.description`，完整工作台重载后仍保持。随后恢复“精密的检测仪器是制造中走丝\n机床的必备。”，保存、认证回读、完整重载及重新选中画布文字均确认恢复值，页面保持 `draft/unpublished`。该项不涵盖检测设备图片的媒体替换。

- 制造页电气装配正文 `pages/8.sections[electrical-assembly].description` 已完成独立真实 PC 闭环：在真实 iframe 中选中“用现代协同配送模式代替传统”正文，属性面板准确显示 `pages · description`。临时值 `电气装配正文 TDD 20260828` 在 900ms 内同步到 iframe；保存草稿后认证 Directus 回读定位到 `sections.6.description`，完整工作台重载后仍保持。随后恢复“用现代协同配送模式代替传统\n手工组装：料库根据信息主动\n将物料配送到工位”，保存、认证回读、完整重载及重新选中画布文字均确认恢复值，页面保持 `draft/unpublished`。该项不涵盖展示图片的媒体替换。

- 制造页钣金车间标题 `pages/8.sections[sheet-metal].title` 已完成独立真实 PC 闭环：真实 iframe 中点击“钣金车间”准确选择 `pages · title`，未误选相邻说明。临时值 `钣金标题 TDD 20260828` 在 900ms 内同步到 iframe；保存草稿后认证 Directus 回读定位到 `sections.3.title`，完整工作台重载后仍保持。随后恢复“钣金车间”，保存、认证回读、完整重载及重新选中画布标题均确认恢复值，页面保持 `draft/unpublished`。该项不涵盖钣金车间图片的媒体替换。

- 制造页钣金车间正文 `pages/8.sections[sheet-metal].description` 已完成独立真实 PC 闭环，并复验了本轮的即时预览竞态修复：画布精确选择正文后，输入临时值会立即更新 iframe，且经过防抖窗口后仍保持，不再被响应式监听器回写为旧值；保存草稿后认证 Directus 回读、完整工作台重载和重新从画布选择都一致。随后恢复两行原文“集成先进的信息技术、自动化设备和工业软件，”及“实现生产过程的高效、精准、透明和柔性。”，再次保存、认证回读与重载后确认原值，页面保持 `draft/unpublished`。该项不涵盖钣金车间图片的媒体替换。

- 关于瑞钧“厂区风貌”标题 `pages/2.sections[factory].title` 已完成独立真实 PC 闭环：在该区块的真实 iframe 中点击标题，属性栏准确为 `pages · title`；临时值立即出现在画布，保存后认证 Directus 回读、完整工作台重载和重新选择均一致。随后恢复“厂区风貌”，再次保存、认证回读与重载后确认原值，页面保持 `draft/unpublished`。厂区图库仍为未托管媒体，本项不包含素材上传或替换。

- 2026-08-31：关于瑞钧的厂区、认证、荣誉、专利、合作品牌及国内/国外客户章节，已把各自可见的标题/小标题接入独立 `field_presentation` 绑定。默认禁用时保持 Nuxt 原有 PSD 布局；启用后仅作用于当前字段，提供受控横向/纵向偏移、字号、字重、行高与颜色，不开放任意 CSS。`cms/scripts/verify-about-factory-title-presentation-preview.mjs` 已完成可逆真实链路验收：临时写入 `pages/2.sections[factory].title` 及 `field_presentation.title` 的 `3% / 40px / 1.4 / #123456`，认证 Directus 回读和受保护 `/about` 草稿预览均实际渲染，随后自动恢复原标题及原 presentation。该项未导入或替换任何图片/视频，未托管 PSD 素材仍只读。

- 关于瑞钧“认证证书”标题 `pages/2.sections[certificates].title` 已完成独立真实 PC 闭环：画布标题命中 `pages · title`，临时值即时进入 iframe；保存草稿后认证 Directus 回读、完整工作台重载和重新从画布选择均一致。随后恢复“认证证书”，再次保存、认证回读与重载后确认原值，页面保持 `draft/unpublished`。证书图片仍为未托管媒体，本项不包含证书素材上传或替换。
- 关于瑞钧“荣誉证书”标题 `pages/2.sections[honors].title` 已完成独立真实 PC 闭环：画布点击标题准确命中 `pages · title`；临时值“荣誉证书 TDD 20260828”在 500ms 内进入 iframe，保存后认证 Directus 回读与完整工作台重载均一致，随后恢复“荣誉证书”并再次认证回读，页面保持 `draft/unpublished`。首轮未更新不是字段或白名单遗漏：工作台已发送新页面快照，但 iframe 的 15 分钟预览令牌已过期并按安全规则拒绝。现按失败测试增加受限的过期回报协议，工作台会显示“实时预览授权已到期，请点击重新连接实时预览。未保存修改仍保留。”；不会接受过期消息或延长令牌。荣誉图片仍为未托管媒体，本项不包含媒体上传或替换。
- 关于瑞钧“专利证书”标题 `pages/2.sections[patents].title` 已完成独立真实 PC 闭环：画布点击标题准确命中 `pages · title`，临时值“专利证书 TDD 20260828”立即进入 iframe；保存后认证 Directus 回读、完整工作台重载和重新打开实时画布均一致，随后恢复“专利证书”并再次认证回读，页面保持 `draft/unpublished`。本项只验收中性标题，不修改仍标记 `requires_claim_review` 的“79件专利，其中发明专利9件”数量说明，也不包含未托管专利素材替换。

- 关于瑞钧“合作品牌”“国内客户”“国外客户”标题 `pages/2.sections[partners].title`、`pages/2.sections[clients-domestic].title`、`pages/2.sections[clients-global].title` 已完成真实 PC 画布闭环。三项画布选择均精确落到当前区块的 `pages · title`；临时值即时进入 iframe，保存后由认证 Directus API 回读确认。完整重载工作台和重新连接实时画布后，三项仍可正确选择；最后均恢复原文并完成最终认证回读。品牌和客户图片仍为未托管媒体，说明字段在当前 Nuxt 模板没有展示位，因此本项不包含媒体替换或不可见字段。

- 产品型号多记录预览已完成真实 PC 闭环：从 `product_models/1` 选中可见 `model_code` 后，通过顶部条目下拉切到 `product_models/2`，旧属性面板立即清空；重新在画布选中后，面板准确显示 `product_models · model_code` 与记录 2 的原值。随后以临时型号编码验证即时预览、草稿保存、认证 Directus 回读、完整工作台重载和原值恢复，记录始终保持 `draft/unpublished`。该验证脚本为 `output/playwright/verify-product-model-record-switch-e2e.cjs`。
- 产品系列多记录回归已完成：工作台选择 `product_series/2`（FR-XS Auto）并打开真实产品画布，点击第二张卡片“自动穿丝系列”准确选择 `product_series · positioning`；临时值即时进入 iframe，保存后的认证 Directus API 回读明确为 `id=2`，而非首张卡片 `id=1`。完整重载工作台、重新打开实时画布后该临时值仍可选中，最终恢复“自动穿丝系列”并完成最终认证回读。此项证明第二系列的选择、预览和保存链路不会串写；不包括仍待正式素材的系列封面替换。
- 修复同集合相关记录切换的实时预览状态：已获预览令牌授权的 `product_models` 关联更新会成为当前画布记录；产品详情同步该记录的系列、型号与根绑定，不再只更新列表缓存却继续显示旧型号。该行为仅接受由预览会话列出的关联记录，不放宽来源、集合或 ID 校验。
- 本轮同时修复工作台初始预览遮挡：实时预览改为显式打开，仍在打开后进入既有 PC 编辑模式；未修改 Nuxt 官网的公开页面布局。
- 2026-08-29：`product_models/15 (FL1180)` 的核心能力首项 `configuration.features.0.label` 已完成真实 PC 画布闭环。画布选择“`五轴数控`”后，属性栏准确显示 `product_models · configuration.features.0.label`；临时值“`五轴数控-TDD`”立即同步到 iframe，保存草稿后完整工作台重载仍读取临时值，随后恢复“`五轴数控`”、保存并重载确认临时值不存在。该记录确有真实 `configuration.features`，因此旧的“PSD fallback 不可保存”判断不适用于该字段；其图片、详情、备注和其它型号仍需分别验收。
- 2026-08-29：对相邻的 `product_models/16 (FL1390)` 进行同字段跨记录回归。切换型号后旧属性选择被清空；画布重新选择“`五轴数控`”仍准确命中 `product_models · configuration.features.0.label`。临时值“`五轴数控-1390-TDD`”仅出现在 FL1390 画布和表单，保存、完整重载后保持；切回 FL1180 确认测试值不存在，最后恢复 FL1390 原文、保存并重载确认临时值不存在。这证明 15 与 16 号记录不会因相同嵌套路径串写。
- 2026-08-29：`product_models/16.configuration.features.0.detail` 起初为空，且官网按模板不渲染空的说明节点。先从型号表单写入临时说明，让真实 Nuxt 画布出现该节点；随后由画布反选，属性栏准确显示 `product_models · configuration.features.0.detail`，二次修改即时同步、保存和完整重载后保持。最后恢复为空，保存、重载后确认临时说明消失。该项证明条件渲染文字在出现后仍具有真实的可视化编辑绑定；它不表示其它特点、图片或备注均已验收。
- 2026-08-29：预览授权到期错误层曾覆盖“重新连接实时预览”按钮，真实浏览器报 `iframe` 错误提示拦截点击。按失败测试将提示层改为只显示、不接收指针事件；用 iframe 同源到期事件复现提示后，真实点击“重新连接实时预览”成功，工作台恢复“实时同步”。这只修复恢复入口，不延长令牌或放宽来源校验。
- 首页首屏 CTA `pages/1.sections[hero].label` 与 `href` 已完成真实 PC 闭环。此前字段为空时画面显示未绑定的默认“了解更多”，无法从画布选中；现已把默认 CTA 绑定到真实字段，并在右侧属性栏提供受站内路径、锚点和 HTTPS 白名单校验的“按钮链接”。浏览器验收完成选中、即时文案与链接更新、草稿保存、认证 Directus 回读、完整工作台重载和原值恢复；页面保持 `draft/unpublished`。这不改变公开 Nuxt 页面版式，也不将首屏静态视频/海报计为媒体替换完成。
- 首页产品区英文标题 `pages/1.sections[products].kicker` 已完成真实 PC 闭环。字段初始为空时，Nuxt 画面会显示默认 “Our product”；画布仍精确选中真实 `kicker`，临时值即时更新、草稿保存、认证回读、完整重载与原值恢复均通过，页面保持 `draft/unpublished`。该项只覆盖区块文字，不把产品卡片的 static fallback 图片、名称或系列伪记为可写内容。
- 首页时间轴英文标题 `pages/1.sections[history].kicker` 与提示语 `label` 已完成真实 PC 闭环。此前画布虽然提供了字段路径，但首页 section fallback 未声明这两个字段，草稿值被受控解析器丢弃，导致即时预览无效；先以失败测试复现后补齐 fallback 声明。两个字段均完成画布选中、即时预览、保存草稿、认证 Directus 回读、完整工作台重载与恢复为空值，记录保持 `draft/unpublished`。默认英文标题和 “SCROLL TO EXPLORE” 继续仅在字段为空时显示，未改变公开 Nuxt 布局；背景和滚轮图标仍是未托管媒体，不计为媒体替换完成。
- 三大特点其余宣传性标题的浏览器验收被策略正确拦截：认证读取确认 `performance`、`advanced-manufacturing`、`industry-leadership` 当前均为 `requires_claim_review=true`。它们不能因“官网可见”而绕过审核进入可保存画布属性；在业务审核清除标记前保持公开端 fallback/拦截，不计入可视化编辑闭环。该限制不影响已验收的非宣传字段，也不是测试工具或启动状态故障。
- 产品分页下一页文案 `pages/7.sections[pagination].pagination.next_label` 已完成真实 PC 闭环：先以失败测试确认嵌套 `pagination` 对象被页面 fallback 丢弃，再按白名单透传 `page_size`、前后页文案等字段，并为按钮补齐画布字段路径。浏览器以受控每页 3 条测试条件使条件性分页显示，完成画布选中、即时预览、草稿保存、认证 Directus 回读、完整工作台重载和原值恢复；测试结束后恢复 `page_size=6` 与“下一页”，页面仍为 `draft/unpublished`。首页的“上一页”处于禁用状态，不能作为点击验收目标；其字段路径已绑定，但不因此提前计为画布闭环。
- 产品分页禁用“上一页”文案 `pages/7.sections[pagination].pagination.previous_label` 已完成真实 PC 闭环：原生禁用按钮不派发指针或点击事件，先以失败浏览器复现确认不能靠预览桥的 `pointerdown` 分支解决；编辑模式下仅对已绑定的禁用文本按钮设置 `pointer-events:none`，让鼠标命中父容器，既有坐标解析再选回最小的真实绑定按钮。真实 Chrome 验证按钮始终保持禁用，同时完成选中、即时更新、草稿保存、认证 Directus 回读、完整工作台重载和原值恢复。该规则不在公开端生效，也不改变分页或页面布局。
- 动态新闻详情预览已接入真实 `/news/<slug>` 画布：此前工作台把文章草稿强制打开到列表页，详情页虽有字段绑定却无法使用。先以失败测试将目标改为详情路由，再发现公开 BFF 对草稿返回 `410` 会在预览叠加前中断 Nuxt。现仅在显式 `cmsPreview=1` 路由保留空壳给授权预览叠加，非预览公开访问仍为 `410`。真实 PC 验收选择 `articles/10.title`，临时值即时进入详情 iframe，受保护 Directus 回读和完整工作台重载均一致，最后恢复“未命名文章”；正文、封面和媒体仍待逐字段与正式素材闭环。
- 产品页“3大”标识 `pages/7.sections[categories].kicker` 已完成真实 PC 闭环：受保护记录字段初始为空，官网正确显示模板默认值“3大”，但首轮浏览器测试证明该属性没有进入 `productSection()` 的 fallback 白名单，画布输入无法即时更新。按失败测试补齐既有默认值字段契约后，真实 Chrome 完成画布选中、即时预览、保存草稿、认证 Directus 回读、独立重新打开工作台和恢复空值；恢复后默认“3大”重新显示。该修复只补齐数据解析白名单，不调整产品页 PSD 坐标、尺寸、动画或公开内容。
- 产品参数名称 `product_parameters/94.field_name` 已完成真实 PC 闭环。失败浏览器验收先暴露两个共用缺陷：防抖回调会被 Vue 监听器传入的页面快照覆盖跨集合目标，且 `product_parameters` 不在实时预览的最小字段白名单中，导致正确记录被发送为空对象。修复后队列仅保留合法 `collection + record` 目标，监听器改为无参触发，参数白名单只放行产品画布所需字段。真实 Chrome 验证画布选中 `product_parameters · field_name`、即时更新、草稿保存、认证 Directus 回读、完整重开工作台与恢复原值；验证脚本为 `output/playwright/verify-product-parameter-label-visual-edit-e2e.cjs`，记录始终为 `draft/unpublished`。这不扩展公开端字段暴露，也不将尺寸图静态素材计为媒体闭环。
- 产品参数单位 `product_parameters/94.unit` 已完成真实 PC 闭环。此前产品预览把数值和单位预先拼成单一字符串，单位虽然可见却不能精确选中。现在预览记录保留独立 `value/unit`，模板仍在原来的同一单元格连续输出“数值 空格 单位”，因此未改变产品页文案、PSD 几何或公开布局。真实 Chrome 验证 `unit` 绑定、即时同步、保存、认证回读、整页重开和恢复 `mm`；通用验证脚本传入字段名运行，记录继续保持 `draft/unpublished`。
- 服务支持“国内直属办事处”的空电话字段现在可在 PC 画布直接补录：此前 `phone` 为空时，公开 Nuxt 模板按原设计不渲染电话节点，视觉编辑无从选择。先以失败测试锁定“公开端隐藏、编辑端仍有精确字段绑定”的边界，再加入仅 `data-cms-preview-edit-mode="true"` 可见的“未填写联系电话”占位，绑定始终指向真实 `pages/3.sections[office-directory].items.{region}.offices.{office}.phone`。真实画布成功选择 `items.1.offices.0.phone`，右侧属性栏为空；测试号码保存后已清空并完整重载，MySQL 直接回读确认字段为空。该改动不向公开官网展示占位，也不更改 Nuxt 版式。
- 2026-08-31：第三地区首门店电话 `pages/3.sections[office-directory].items.2.offices.0.phone` 已完成真实 PC 画布闭环。历史办事处对象缺失 `phone` 键时，属性栏输入会即时更新 iframe 却无法进入 `pageDraft.sections` 保存请求；现已在服务页面草稿规范化阶段补齐既有门店的空电话字段。点击“未填写联系电话”输入验收号码后，属性面板、iframe、`PATCH /items/pages/3` 请求及完整重载均一致，随后恢复为空并再次保存。此项只解决历史草稿兼容，不改变公开 Nuxt 布局或把其它未验收字段计为完成。
- 视频新闻动态文章日期 `articles/10.display_date` 已完成真实 PC 画布闭环。首次打开实时预览时，脚本在 iframe 挂载前取帧，误判为预览不可用；实际令牌签发返回 `201`，等待 iframe 挂载后功能正常。画布选中日期、填写 `2026-08-25` 后即时显示“2026年8月25日”；保存草稿经认证 Directus 回读确认，随后恢复 `2026-08-24`，完整工作台重载后仍精确选中 `articles · display_date`。文章保留 `draft/unpublished`，本项不包含缺少正式素材的封面或视频替换。
- 视频新闻动态文章正文 `articles/10.body` 已完成真实 PC 画布闭环。验收先发现一个草稿保留缺陷：正文在 iframe 中即时显示后，点击同一正文会无条件重新选择文章并以数据库旧值覆盖未保存草稿。现按失败测试修复为仅当集合、记录 ID 和草稿记录完全相同时保留当前草稿，真正切换记录仍按既有流程加载。画布属性面板同时按文章正文的受控上限支持 `30000` 字符，不再沿用短字段的 `4000` 字符限制。真实浏览器确认画布点击后表单、属性面板和 iframe 仍为同一未保存正文；从属性面板修改、保存草稿后认证 Directus 回读 `articles/10.body` 一致，完整工作台重载也一致，最后恢复为空字符串并再次认证回读 `draft/unpublished`。封面、正文媒体和其它文章字段仍待各自闭环。
- 视频新闻动态文章摘要 `articles/10.summary` 已完成真实 PC 画布闭环。字段起始为空，工作台先输入临时摘要使详情页真实渲染该段落；打开实时预览后点击摘要准确命中 `articles · summary`，从右侧属性栏修改能即时反映到 iframe。保存草稿后的认证 Directus 回读与完整工作台重载均保持一致，最终恢复空字符串并确认记录仍为 `draft/unpublished`。验收截图为 `output/playwright/news-article-summary-visual-editing.png`；封面、正文媒体和字幕仍待逐项闭环。
- 1440px PC 工作台实时预览不再挤压编辑表单。此前第三列画布在 Directus 内容区保留 222px 菜单和过宽预览，导致主表单只剩约 300px，用户感知为预览遮挡。先增加失败测试，再在工作台预览状态下按断点保留“176px 菜单 + 至少 360px 表单 + 至少 520px 画布”；1600px 以上提升为 222px、400px、640px。此规则仅作用于 CMS 工作台，不变更 Nuxt 页面布局或手机端。扩展重建、真实 1440px Chrome 画布摘要编辑回归、CMS `301/301` 与 Directus/Nuxt 健康检查均已通过。
- 视频分享字幕 `articles.transcript` 的实时画布通路已修复：工作台发送该字段，但 Nuxt 接收预览消息的文章安全白名单遗漏 `transcript`，导致条件渲染段落始终消失。先以失败单测确认该字段被剥离，再仅将其加入文章允许字段，私有字段仍继续过滤。临时视频草稿的真实画布已出现并精确选中 `articles · transcript`，截图为 `output/playwright/news-video-transcript-visual-editing.png`。该草稿没有关联已发布的视频素材，保存被业务规则正确阻断，且临时记录已删除；因此“实时编辑展示”已验证，但“真实视频记录的保存、重载与公开发布”仍待受治理视频素材到位后单独验收。
- 制造页工艺节点 `pages/8.sections[process].items.0` 已完成真实 PC 闭环。此前该集合为空，画布没有实际 CMS 节点可验收；按失败测试补齐受控 `connection_label` 序列化与预览安全白名单，并将嵌套 `items` 改为递归净化，避免内部字段进入 iframe。真实 Chrome 从“先进制造 -> 工艺流程画布”新增节点，填写标题、正文、连接说明和左上锚点；节点即时显示在 Nuxt 画布，保存草稿后认证 Directus 回读、完整工作台重载均一致。最终删除临时节点并再次保存，认证回读确认 `items=[]`，页面保持 `draft/unpublished`。截图为 `output/playwright/manufacturing-process-live-preview.png`；这只验收节点文本与固定锚点，不包含尚无正式素材的节点媒体。

- 2026-08-31：产品型号 `product_models/15.model_code` 已完成多记录防串写真实 PC 验收。画布当前指向 `FL1180` 后，选中官网 iframe 内的型号按钮，右侧属性面板精确显示 `product_models · model_code`。将其临时改为 `fl1180-visual-proof` 时，iframe 按钮和预览状态立即更新；保存草稿后认证 Directus 回读 `15.model_code=fl1180-visual-proof`，同时对照记录 `17.model_code` 仍为 `fl1610`。重新加载工作台、重新进入“产品展示 -> 产品型号、参数与尺寸图”后表单读回测试值，证明数据已持久化而非浏览器暂存。验收结束已通过工作台恢复 `15.model_code=fl1180` 并认证回读。该项只覆盖受控型号编码字段；工作台重新加载后默认回到“网站主页”，不会自动恢复此前打开的产品区块，这是当前工作流限制，不应宣称为已完成的“编辑会话恢复”。

- 2026-08-29：产品参数数值 `product_parameters/94.value` 的字段级样式已完成人机画布闭环。真实 PC 画布选择 `1100*800mm` 后，右侧属性栏准确显示 `product_parameters · value`，并提供横向/纵向偏移、字号、字重、行高、文字颜色。临时设为 `20px`、`#C62828` 后，Nuxt iframe 即时更新；点击“保存草稿”后认证 Directus 回读 `presentation.field_presentation.value.text_style` 为 `enabled=true,size_desktop=20,line_height=1.35,color=#C62828`。完整重载工作台、重新进入“产品展示 -> 技术参数与尺寸图 -> FL1180”并从画布再次选择该数值后，属性栏仍显示同一组设置。验收结束已恢复 `presentation=null`，并经认证回读确认记录仍为 `draft/unpublished`。本项仅覆盖参数文字样式，不包括尺寸图静态素材替换。
- 2026-08-29：服务支持“服务入口”第三张卡片 `pages/3.sections[support-actions].items.2.title` 的条目级样式与位置实时预览已修复并完成真实 PC 验收。根因是 Nuxt 预览接收端对嵌套 `items.*.text_style/layout` 仅保留了 `enabled`，丢失字号、字重、颜色和偏移值；同时重复卡片缺少条目自身的文字样式 CSS 规则。现仅放行既有受控 presentation schema，继续拒绝任意 CSS、脚本和未知字段。真实画布把该卡片临时设为 `24px`、横向偏移 `4%` 后即时显示为 `24px` 与 `translate: 4% 0%`，相邻卡片仍是 `13.5px`；验证结束已取消未保存草稿。网站 `335/335`、CMS `315/315` 自动测试通过，不改变 Nuxt 原 PSD 布局或公开页面内容。
- 2026-08-29：服务支持“服务入口”第三张卡片文案 `pages/3.sections[support-actions].items.2.title` 已完成完整真实 PC 工作台闭环。画布点击“服务流程与寄修”准确命中 `pages · items.2.title`；临时文案“服务流程与寄修 TDD 20260829”即时进入 Nuxt iframe，工作台保存成功后认证 Directus 回读 `HTTP 200`、页面状态 `draft/unpublished` 且字段值一致。工作台“重新加载”后属性面板和 iframe 均保留测试值；随后已恢复原文、再次保存并受保护回读，最终重载确认无未保存修改和测试值残留。本项只验收第三张服务入口的标题；图标仍为静态 fallback，未计入正式媒体替换。
- 2026-08-29：服务支持“适用型号”首张卡片 `pages/3.sections[support-models].items.0.label` 的条目级画布绑定已完成真实 PC 验收。此前型号卡片没有将 `items.*.presentation` 带到各自可点击卡片；现按失败测试补齐条目自身的受控 presentation 绑定，不改变默认 PSD 几何。真实工作台选择“灵动工作站”后属性栏准确显示 `pages · items.0.label`；临时文案“灵动工作站·画布验证”即时只同步第一张卡片，保存草稿、工作台重新加载后仍存在，随后恢复“灵动工作站”并再次保存。最终 iframe、表单和属性栏均为原值且无未保存修改；本项不包含尚未治理的型号图片替换。网站自动测试 `336/336` 通过。

- 2026-08-29：产品展示“三大指标”中，官网可见 `50%` 曾来自 Nuxt fallback，但旧页面草稿将 `value`、`unit` 初始化为空字符串，导致画布选中正确字段后属性栏为空。现工作台只在产品三大指标的历史空数值/单位字段中补齐与 Nuxt 一致的受控草稿默认值，不覆盖标题、正文或已有非空 CMS 值，也不自动写入 Directus。重建工作台扩展并重启 Directus 后，真实 PC 画布点击 `50%` 显示 `pages · value`，属性栏为 `50`；同一表单显示“展示数值 50 / 数值单位 %”。该指标带 `requires_claim_review`，本次不绕过审核保存宣传主张。CMS `316/316`、官网 `336/336` 自动测试通过。

- 2026-08-29：制造页“智能物料仓储”标题 `pages/8.sections[smart-warehouse].title` 已完成独立真实 PC 画布闭环。通过工作台“先进制造 -> 智能物料仓储”选择画布标题，属性面板准确命中 `pages · title`；临时值即时进入 Nuxt iframe，保存草稿后受保护 Directus 回读一致，完整重载工作台与再次选择画布标题后仍保持。验收脚本最后恢复“智能物料仓储”并认证回读原值，页面状态始终为 `draft/unpublished`。该项仅覆盖标题文字，不将未托管的仓储展示图计为正式媒体替换完成。

- 2026-08-29：制造页“精密检测”标题 `pages/8.sections[whole-machine-validation].title` 已完成独立真实 PC 画布闭环。画布选中标题后属性面板命中 `pages · title`；临时值即时进入 iframe，保存草稿后受保护 Directus 回读、完整工作台重载和重新从画布选择均保持一致。验收最后恢复“精密检测”并再次认证回读，页面状态始终为 `draft/unpublished`。该项不包含未托管检测设备图片的替换。

- 2026-08-29：制造页“CNC车间”标题 `pages/8.sections[precision-machining].title` 已完成独立真实 PC 画布闭环。通过画布选择标题，属性面板准确命中 `pages · title`；临时值即时进入 iframe，保存后受保护 Directus 回读、完整工作台重载和再次选择均保持一致。验收最后恢复“CNC车间”并完成认证回读，页面始终为 `draft/unpublished`。已验收的正文与核心设备说明不因此被合并为整段完成，CNC 图片仍保持未托管媒体状态。

- 2026-08-29：制造页“电气装配”标题 `pages/8.sections[electrical-assembly].title` 已完成独立真实 PC 画布闭环。画布选择标题后属性面板准确为 `pages · title`；临时值即时进入 iframe，保存草稿后的受保护 Directus 回读、完整工作台重载和再次选择均一致。验收最后恢复“电气装配”并完成认证回读，页面始终为 `draft/unpublished`。该项只覆盖标题，展示图仍为未托管静态媒体。

- 2026-08-29：首页“三大理由”总标题 `pages/1.sections[why-ruijun].title` 已完成独立真实 PC 画布闭环。画布选择“选择瑞钧的三大理由”后属性面板准确命中 `pages · title`；临时值即时进入 iframe，保存草稿后的受保护 Directus 回读、完整工作台重载和再次选择均一致。验收最后恢复原值，页面始终为 `draft/unpublished`。本项只覆盖非宣传性总标题，不绕过仍标记 `requires_claim_review` 的三条理由内容审核。

- 2026-08-29：首页产品区中文标题 `pages/1.sections[products].title` 已完成独立真实 PC 画布闭环。画布选中“我们的产品”后属性面板准确为 `pages · title`；临时值即时进入 iframe，保存草稿后的受保护 Directus 回读、完整工作台重载与再次选择均一致。验收最后恢复“我们的产品”，页面始终为 `draft/unpublished`。该项与已验收的英文 `kicker` 分开记录，不将产品卡片的静态 fallback 图片计为媒体替换完成。

- 2026-08-29：首页“选型咨询”说明 `pages/1.sections[product-task].body` 已完成独立真实 PC 画布闭环。画布选择说明文字后属性面板准确为 `pages · body`；临时值即时进入 iframe，保存草稿后的受保护 Directus 回读、完整工作台重载和再次选择均一致。验收最后恢复“通过工件、精度、节拍和自动化需求获得选型建议。”，页面始终为 `draft/unpublished`。此前标题的位置与样式验收不代替本正文验收，CTA 文字和链接仍按各自字段单独计算。

- 2026-08-29：首页“选型咨询”CTA 文案 `pages/1.sections[product-task].label` 已完成独立真实 PC 画布闭环。该真实字段初始为空，官网按原版显示默认按钮文字；画布仍可准确选中 `pages · label`，临时值即时进入 iframe，保存草稿、受保护 Directus 回读、完整工作台重载均一致。验收最后恢复空值并确认官网默认显示复原，页面始终为 `draft/unpublished`。本项不代替 CTA 链接的独立受控验证。

- 2026-08-29：首页“选型咨询”CTA 链接 `pages/1.sections[product-task].href` 已完成真实 PC 画布闭环。此前 Nuxt 仅为按钮文字声明了画布绑定，工作台无法把链接作为受控属性显示或保存；现只补充 `data-cms-preview-link-field-path="href"`，不改变按钮样式、位置或默认 `/contact` 行为。真实 Chrome 中先在工作台保存临时文案与 `#products`，实时 iframe 随即显示该文案和目标；画布点击按钮后属性栏同时显示“文字内容”和“按钮链接”，可直接保存。最终清空测试字段、保存并完整重载后，CMS 两字段重新为空，iframe 正确恢复 Nuxt 默认“获取选型建议”与 `/contact`。记录保持 `draft/unpublished`，未留下测试数据。

- 2026-08-29：产品展示“选择瑞钧理由”标题 `pages/7.sections[categories].title` 已完成真实 PC 画布文字、位置和样式闭环。此前标题可选择文字但没有字段级 presentation 标记，不能承接该字段专属的偏移或文字样式；先以失败测试锁定缺口，再只在既有标题节点接入 `fieldPresentationAttributes(categoriesCopy, 'title')` 与 `field_presentation.title`，未改变 PSD 默认坐标。真实 Chrome 画布精确选中 `pages · title`；临时标题即时进入 iframe，保存后受保护 Directus 回读、完整工作台重载和原文恢复均通过。额外把该标题临时设为横向偏移 `3%`、字号 `40px`，iframe 计算字号立即为 `40px`，保存回读为该字段独立的 `layout.enabled=true, desktop.offset_x=3, text_style.enabled=true, size_desktop=40`，重载属性栏仍显示相同值；验收结束已恢复原 presentation 配置，页面保持 `draft/unpublished`。

- 2026-08-29：产品展示“三大”标识 `pages/7.sections[categories].kicker` 已完成独立真实 PC 画布文字、位置和样式闭环。其初始 CMS 字段为空，官网继续显示 Nuxt 默认“3大”；失败测试确认该标识此前没有自身的字段级 presentation 绑定，修复仅接入 `fieldPresentationAttributes(categoriesCopy, 'kicker')` 与 `field_presentation.kicker`。真实 Chrome 选中后属性栏准确为 `pages · kicker`；临时文案、横向偏移 `3%` 和字号 `40px` 立即进入 iframe，保存后的受保护回读只出现 `field_presentation.kicker` 的受控位置/样式，完整工作台重载仍保留，未改变同区块 `title`。最后恢复为空值和原 presentation 配置，默认“3大”重新显示，页面保持 `draft/unpublished`。

- 2026-08-29：产品展示首屏标题 `pages/7.sections[hero].title` 已完成真实 PC 画布文字、位置和样式闭环。该字段使用独立 `field_presentation.title` 绑定；真实 Chrome 验收在首屏画布中精确选中 `pages · title`，临时文案、横向偏移 `3%` 与字号 `40px` 即时进入 iframe。保存后认证 Directus 回读、完整工作台重载与原值/原 presentation 配置恢复均通过，未修改 PSD 默认坐标、尺寸、动画或公开布局，页面保持 `draft/unpublished`。

- 2026-08-29：产品展示首屏副标题 `pages/7.sections[hero].kicker` 已完成独立真实 PC 画布文字、位置和样式闭环。真实 Chrome 验收验证其可从标题组合中独立命中 `pages · kicker`，临时文案、横向偏移 `3%` 与字号 `40px` 立即同步到 iframe；保存草稿经认证 Directus 回读一致，重新打开工作台后属性栏仍保留该字段专属配置，最终恢复“我们的产品”和原 presentation 配置。该项不代表首屏静态背景或产品图已具备媒体替换能力，页面仍为 `draft/unpublished`。

- 2026-08-29：产品展示“尺寸与资料说明” `pages/7.sections[dimensions].body` 已完成真实 PC 画布文字、位置和样式闭环。验收先暴露两项真实缺口：工作台没有页面级尺寸说明入口，且 CMS 空字段导致属性栏无法显示官网 fallback；现拆分为“尺寸与资料说明”（页面区块）与“产品型号、参数与尺寸图”（型号数据）两个不重复入口，并仅在工作台内将空正文填充为官网同一默认文案，不自动写入 Directus。真实 Chrome 从新入口进入、暂时退出画布编辑打开产品详情后重新进入编辑模式，精确选中 `pages · body`；临时正文、横向偏移 `3%` 与字号 `18px` 即时进入 iframe，保存草稿后的认证 Directus 回读、完整工作台重载和属性栏重选均一致，随后恢复空字段和原 presentation 配置，官网默认文案正确恢复。截图：`output/playwright/product-dimensions-notice-visual-edit-e2e.png`；尺寸图仍为未托管静态素材，不计为媒体替换完成。

- 2026-08-29：产品系列卡片的 `name` 与 `positioning` 已补齐独立、受控的 `product_series.presentation.field_presentation` 存储通道。TDD 已覆盖位置、字号/字重/行高/颜色、预览净化、官网读取和既有产品参数 presentation 不回归；Directus 实际已创建 `product_series.presentation` 字段并完成工作台扩展重建与重启。公开产品页的六张卡片均正常渲染，浏览器确认名称节点绑定 `presentation.field_presentation.name`、定位文案绑定 `presentation.field_presentation.positioning`。真实 PC 工作台验收已完成：选择 `product_series/1.name` 后，临时设置横向偏移 `3%`、字号 `26px`、行高 `1.4`、颜色 `#C62828`，iframe 立即计算为 `26px`、`36.4px`、`rgb(198, 40, 40)`；保存后认证 Directus 回读一致，完整重载工作台并重开预览后右侧属性仍为 `3/26/1.4/#c62828`。期间发现工作台实时预览字段白名单遗漏 `presentation`，造成“已保存但画布默认”的真实断链，现已补齐且以模块回归测试锁定。验收结束后已认证恢复 `presentation=null`，截图：`output/playwright/product-series-name-visual-edit-e2e.png`。本项仅覆盖产品卡片文字和定位文案的受控位置/样式，不包含尚未治理的静态封面替换。

- 2026-08-29：同一产品卡片的定位文案 `product_series/1.positioning` 已完成独立真实 PC 画布闭环。画布点击“无人化加工解决方案”准确命中 `product_series · positioning`；临时设置横向偏移 `4%`、字号 `18px`、行高 `1.4`、颜色 `#C62828` 后，iframe 立即计算为 `18px`、`25.2px`、`rgb(198, 40, 40)`，同卡片名称仍为默认白色 `14.688px`。保存后认证 Directus 回读仅出现 `presentation.field_presentation.positioning`；完整工作台重载、重开预览和重新选中后属性栏仍为 `4/18/1.4/#c62828`。验收结束后恢复 `presentation=null` 并回读确认记录保持 `draft/unpublished`。截图：`output/playwright/product-series-positioning-visual-edit-e2e.png`。

- 2026-08-29：产品型号详情的介绍标题 `product_models/1.configuration.intro.title` 已完成真实 PC 画布文字、位置和样式闭环。该型号的原始介绍字段均为空，先以临时草稿使真实 Nuxt 画布出现介绍区，再从画布选中标题，属性栏准确显示 `product_models · configuration.intro.title`。临时设置横向偏移 `3%`、字号 `36px`、行高 `1.6`、颜色 `#123456` 后立即进入 iframe；通过“保存型号信息”保存后，认证 Directus 回读只出现受控 `configuration.field_presentation.intro_title`，记录保持 `draft/unpublished`。完整重载工作台、重新进入“产品展示 -> 产品型号、参数与尺寸图”、重新打开实时预览并从画布选择该标题后，属性栏仍为 `3/36/1.6/#123456`。验收结束按审计版本恢复完整原 `configuration`，认证回读确认介绍字段回到空值、`field_presentation` 已移除且原有 3 个特点保持不变。截图：`output/playwright/product-model-intro-live-style.png`。本项证明可视化编辑链路，不表示当前生产数据已具备可展示的介绍文案。

- 2026-08-29：首页首屏 CTA `pages/1.sections[hero].label` 现在具备独立的字段级位置与文字样式绑定。先以失败测试锁定正文和 CTA 缺少 `fieldPresentationAttributes` / `field_presentation` 路径，再仅在首屏正文及两个同源 CTA 节点接入既有受控白名单，未改变视频、动画或默认 PSD 坐标。真实 Chrome 画布选中 CTA 后，临时设置横向偏移 `3%`、字号 `28px`、行高 `1.4`、颜色 `#123456`，iframe 实际计算为 `translate: 3% 0%`、`28px`、`39.2px`、`rgb(18, 52, 86)`；保存、认证 Directus 回读与完整重载均一致。验收结束恢复空文案并确认 `field_presentation.label` 已不存在，记录保持 `draft/unpublished`。截图：`output/playwright/home-hero-label-e2e.png`。

- 2026-08-29：首页首屏正文 `pages/1.sections[hero].body` 已完成独立真实 PC 画布文字、位置和样式闭环。该字段初始为空，验收通过工作台临时写入可见正文后从 Nuxt 画布选择，属性面板准确命中 `pages · body`；临时文案、横向偏移 `3%`、字号 `28px`、行高 `1.4`、颜色 `#123456` 即时进入 iframe。保存后认证 Directus 回读 `field_presentation.body`，完整工作台重载并重新从画布选择后文字与样式保持一致；最终恢复空正文、移除该字段 presentation 并认证回读，页面始终为 `draft/unpublished`。验收脚本同时修正了重载后引用卸载 iframe 的假阴性，截图：`output/playwright/home-hero-body-e2e.png`。本项不改变原视频、动画或默认 PSD 坐标。

- 2026-08-29：视频新闻“动态新闻标题” `pages/9.sections[dynamic-news].title` 已完成独立真实 PC 画布文字、位置和样式闭环。先以失败测试锁定该标题缺少字段级 presentation，再仅在标题节点接入 `fieldPresentationAttributes(dynamicNewsSection, 'title')` 与 `field_presentation.title`，未改变新闻列表或分页布局。真实 Chrome 临时修改文案、横向偏移 `3%`、字号 `28px`、行高 `1.4`、颜色 `#123456` 后即时进入 iframe；保存后认证 Directus 回读、完整工作台重载与再次选择均保持，最终恢复“动态新闻”和原 presentation 配置。验收同时修正了新闻区块内页面标题与文章标题同路径时按 DOM 顺序误选文章记录的问题，现按真实 `pages/9` 绑定定位；页面保持 `draft/unpublished`。

- 2026-08-29：视频新闻“视频分享标题” `pages/9.sections[video-sharing].title` 已完成独立真实 PC 画布文字、位置和样式闭环。仅在既有标题节点接入 `fieldPresentationAttributes(videoSharingSection, 'title')` 与 `field_presentation.title`，未改变视频卡片、分页、默认页面布局或视频末帧停留行为。真实 Chrome 从画布准确选中 `pages · title`，临时文字与字段专属位置/样式即时进入 Nuxt iframe；保存草稿、认证 Directus 回读、完整工作台重载及再次选择均一致，验收脚本最终恢复原文“视频分享”及原 presentation 配置。回读记录保持 `draft/unpublished`，截图：`output/playwright/news-video-sharing-title-e2e.png`。

- 2026-08-31：恢复实时预览服务链路。Nuxt 开发服务器的 `cms-article-reader` 使用跨目录相对模块路径时，被 Nitro 开发产物错误重写为 `D:\shared\section-presentation.mjs`，导致官网和预览接口返回 HTTP 500；现改为项目已有的同目录服务端 presentation 适配层，既可供 Nuxt/Nitro 使用，也可供原生 Node 测试解析。重启后主页、Directus 健康接口和 MinIO 健康接口均返回 HTTP 200。MySQL、MinIO、Directus、Nuxt 已按依赖顺序恢复。此修复不改变 Nuxt 页面视觉、路由或 PSD 布局；Nuxt 生产构建已通过。

- 2026-09-01：修复内容编辑工作台在 901px 以上桌面宽度下被固定 CMS 导航贴边遮挡的问题。此前仅工具栏、说明和消息区预留 16px，实际“选择要修改的网站区块”和编辑表单仍贴着左侧固定菜单。现将同一安全间距应用于非实时预览状态的内容区和空状态；不改 `website` 任何 Nuxt 页面、PSD 坐标、路由或动画。先以失败测试覆盖，再通过模块测试 `50/50` 与 CMS 全量测试 `371/371`；Directus 重启后在 `929x900` 真实浏览器截图复核，且“网站主页 -> 首页视频”可实际进入对应编辑区。截图：`.playwright-cli/page-2026-09-01T02-20-22-274Z.png`、`.playwright-cli/page-2026-09-01T02-20-51-592Z.png`。

- 2026-09-01：首页首屏视频实时预览已修复并完成真实可逆闭环。根因不是 CMS 字段未保存：工作台已正确写入 `pages/1.sections[hero].hero_video_asset_id`，但 Nuxt 模板仅更新嵌套 `<source>`，浏览器不会自动重新加载已存在的 `<video>`，因而持续播放 `/assets/home-intro-raw.mp4`。现将源地址直接绑定到 `<video :src>` 并以 `:key="heroVideoSource"` 重建播放器；不改变默认视频、公开页面版式、路由、PSD 坐标或动画。先以失败测试锁定该 DOM 契约，修复后 `website/test/cms-live-preview.test.mjs` 为 `75/75`。真实已登录工作台验证：选中草稿 `media_assets/49` 时 iframe `currentSrc` 为 `http://127.0.0.1:8055/assets/fd91ae8c-28e2-4270-a3fe-7b21e0669a10`；切回“沿用官网原首屏视频”即时回退至 `http://127.0.0.1:4175/assets/home-intro-raw.mp4`；再选回草稿后即时恢复。保存后认证 Directus API 回读 `pages/1` 的 `hero_video_asset_id="49"`，完整重载工作台并重新打开预览后选择器与 iframe 均保持。截图：`output/playwright/home-hero-video-select-save-reload-restore-20260901.png`。该素材仍为 `draft/pending_review` 的内部预览素材，未公开发布。

- 2026-08-31：动态新闻文章 `articles/10` 的类别、标题、发布日期、摘要和正文已补齐独立 `field_presentation.{category,title,display_date,summary,body}` 存储、预览净化、公开读取和详情页画布绑定。当前该文章摘要、正文为空，因此浏览器验收先以可逆草稿使真实节点出现；工作台画布依次选中五个字段后，类别临时设为 `13px / 1%`、标题为 `26px / 3%`、发布日期为 `16px / 2%`、摘要为 `22px / 4%`、正文为 `20px / 5%`，均即时进入详情 Nuxt iframe。每项保存后均通过认证 Directus 回读，并在完整重载工作台、再次从画布选择后保留。验收脚本最后恢复原标题、原日期、空摘要、空正文和完整原 presentation 数据，记录未留下测试值。截图：`output/playwright/news-article-title-presentation-e2e.png`、`output/playwright/news-article-detail-copy-presentation-e2e.png`。当前没有可展示的正式视频文章，字幕字段、封面和视频媒体不计为完成。

- 2026-08-31：新闻列表卡片补齐字段级样式与位置绑定。动态新闻卡片的类别、标题、日期分别指向 `articles.field_presentation.category/title/display_date`；视频分享卡片的标题、日期同样接入对应字段，并在从文章记录生成视频卡片时保留原始 `field_presentation`，避免样式数据在映射中丢失。该补丁未改变新闻卡片尺寸、网格、分页或视频播放行为；`82/82` 相关官网回归测试通过。由于当前没有受治理的正式视频素材记录，视频卡片仍待独立真实浏览器保存/重载验收，不计为媒体替换完成。

- 2026-08-31：修复文章实时预览首次打开时丢失字段样式的问题。此前预览令牌只携带文章正文数据，工作台后续 `postMessage` 虽会补发 `field_presentation`，但新 iframe 在该消息到达前可能按模板默认样式渲染。现在令牌仅携带新闻页面实际可见的 `category/title/display_date/summary/body/transcript` 六个字段的受控 `field_presentation`，非法 CSS 和未知字段继续在服务端剔除。先以失败测试复现，修复后 CMS `325/325` 通过；真实 Chrome 从 `视频新闻 -> 动态新闻内容` 打开画布、保存标题 `45px`、完整重载工作台并重新打开 iframe 后，首次渲染即为 `45px`。验证结束后已认证回读恢复 `articles/10.field_presentation=null`，记录仍为 `draft/unpublished`。尝试临时公开该草稿以验证真实列表卡片时被发布工作流以“未审核内容不可发布”拒绝，状态和数据未变化；这证明不能以绕过审核替代列表验收，卡片的正式发布场景仍待受治理素材与审核流程联测。

- 2026-08-31：动态新闻列表卡片的类别 `articles/10.category` 与发布日期 `articles/10.display_date` 已完成独立真实 PC 画布闭环。工作台切换到“列表卡片画布”后，点击卡片的 `news` 和 `2026年8月24日` 分别精确命中 `articles · category` 与 `articles · display_date`，不会误选页面标题或文章详情字段。为保持新闻类型和业务日期不被测试改变，本次只临时设置类别字号 `17px`、日期字号 `18px`；两项均即时进入官网 iframe，保存后认证 Directus 回读为 `17/18`，完整工作台重载后 iframe 计算样式仍为 `17px/18px`。验收结束已将 `field_presentation` 完整恢复为 `null`，类别与日期默认字号恢复 `13px/14px`，记录保持 `draft/unpublished`。截图：`output/playwright/news-list-card-metadata-visual-edit-e2e.png`；网站契约测试 `20/20`、CMS 定向测试 `52/52` 与扩展构建通过。

- 2026-08-31：服务支持首屏的可见文字已补齐独立字段级位置/样式绑定：`pages/3.sections[hero].field_presentation.{kicker,title,description,body,label}` 和三条说明各自的 `items.{index}.field_presentation.{label|title|body}`。默认配置为空时，现有 Nuxt/PSD 坐标、图片、动画与公开页面布局不变。新增可逆验证 `cms/scripts/verify-service-hero-title-presentation-preview.mjs`：临时写入标题、横向偏移 `3%`、字号 `40px`、行高 `1.4`、颜色 `#123456` 后，认证 Directus 回读、受保护预览会话与 Nuxt `/service?cmsPreview=1` HTML 均确认同一字段和 CSS 变量已渲染；最后从最新快照恢复标题及完整原 presentation，结果 `pages/3/hero`、`restored=true`。静态首屏背景仍未接入受治理媒体，不能宣称为可替换。

- 2026-08-31：服务支持首屏标题完成真实 PC 画布补充验收。工作台通过 `服务支持 -> 服务支持首屏 -> 打开实时预览` 打开现有 Nuxt iframe，点击“售后服务”后属性面板精确显示 `pages · title`。临时改为“售后服务-画布验收”后，属性面板、工作台表单和 iframe 标题同步更新；保存草稿后认证 Directus 回读确认 `pages/3.sections[id=hero].title`。点击“重新加载”后仍保留临时值；随后在同一属性面板恢复“售后服务”、保存并重载，最终认证回读为 `restored=true`。验证前先运行字段级位置/样式可逆脚本，结果 `pages/3/hero`、`restored=true`；不改变 Nuxt 布局，也不将未托管首屏背景计为可替换媒体。

- 2026-08-31：服务支持“瑞钧支持”区块的标题、说明、搜索提示和按钮文字已补齐独立字段级位置/样式绑定，路径分别为 `pages/3.sections[support].field_presentation.{title,body,description,label}`。只在既有元素添加受控 presentation 属性，搜索区网格、交互、默认文字及 Nuxt 原有布局保持不变。`cms/scripts/verify-service-support-title-presentation-preview.mjs` 临时写入标题、横向偏移 `3%`、字号 `40px`、行高 `1.4`、颜色 `#123456`，认证 Directus 回读、预览会话和 Nuxt `/service?cmsPreview=1` HTML 都确认已渲染；最后完整恢复原值和配置，结果 `pages/3/support`、`restored=true`。输入提示与按钮还需完成实际画布保存/重载的人机验收；图标/卡片图片仍待正式媒体治理。

- 2026-08-31：服务支持的适用型号与服务入口卡片已补齐子元素级 presentation，型号名称指向其真实 `items.{sourceIndex}.{label|title}` 和 `field_presentation`；服务入口标题、说明分别指向其真实源索引，修复了过滤条目后仍以模板循环索引绑定说明的串写风险。默认样式为空时卡片尺寸、网格与点击交互不变。`cms/scripts/verify-service-action-card-title-presentation-preview.mjs` 临时写入第一张入口标题及 `3% / 28px / 1.4 / #123456`，认证 Directus 回读、预览会话和 Nuxt HTML 均确认对应字段渲染；整个过程断言第二张入口卡片保持不变，最后自动恢复，结果 `pages/3/support-actions`、`restored=true`。型号图标和服务入口图案仍未接入正式受治理媒体。

- 2026-08-31：服务支持“国内直属办事处”的页面草稿来源标题已补齐字段级位置/样式：区块 `kicker/title` 与地区 `items.{index}.{title|label}` 各自保留独立 `field_presentation`。渲染会优先选页面草稿条目路径；在仅有独立 `service_locations` 的后备数据时，仍使用原有记录字段但不提供虚假的样式入口。`cms/scripts/verify-service-office-first-region-title-presentation-preview.mjs` 临时写入第一地区标题和 `3% / 32px / 1.4 / #123456`，认证 Directus 回读、预览会话与 Nuxt `/service?cmsPreview=1` HTML 均确认；同次断言第二地区对象保持不变，最后自动恢复，结果 `pages/3/office-directory`、`restored=true`。地图与地区图片仍待正式受治理媒体。

- 2026-08-31：产品型号代码 `product_models/17.model_code` 现完成真实 PC 画布闭环。工作台在 `FL1610` 详情画布点击可见型号编码，属性面板精确命中 `product_models · model_code`；测试值即时只更新对应模型的导航编码，保存后完整工作台刷新仍保留。随后恢复 `fl1610`，最后一次 `PATCH /items/product_models/17` 返回 `200` 且请求体确认原值写回。此前 API/预览闭环不再是该字段唯一证据；这不包含静态机床图或其它模型字段的媒体验收。

- 2026-08-31：服务支持“国内直属办事处”第三个地区首门店地址与负责人 `pages/3.sections[office-directory].items.2.offices.0.{address,manager}` 已完成真实 PC 画布闭环。工作台直接点击 iframe 中“东莞长安店：东莞市长安镇振安东路768号”和“孙金诚经理”，右侧属性面板分别精确命中对应五层字段路径；临时值即时进入画布，点击保存后管理员 Directus 回读通过，工作台重新加载后仍显示临时值。负责人保存还断言地址未变化。结束时均从同一属性面板恢复原值并再次回读，未留下验收文字。截图：`output/playwright/service-office-third-region-address-visual-editing-20260831.png`、`output/playwright/service-office-third-region-manager-visual-editing-20260831.png`。

- 2026-09-01：生产核心设备媒体草稿闭环已补齐。受控候选 `media_assets/50`（`manufacturing.equipment.image`、页面 `manufacturing`、区块 `core-equipment`）已绑定到 `pages/8.sections[core-equipment].media`，两者仍为 `draft/unpublished`，素材版权状态保持 `pending_review`。工作台选择器现在只会向该区块显示匹配页面、区块和使用范围的内部草稿，并明确标记“草稿素材，仅当前内部预览”；保存时再次校验，不能用任意草稿 ID 绕过。此前官网草稿预览只携带媒体 ID，导致 Nuxt 回退 PSD 图；现改为短期预览会话限定的同源代理 `/api/preview/media/:assetId`。真实接口验收：预览跳转 `303`、目标 `[data-cms-preview-key="core-equipment"]`、媒体代理返回 PNG `200`（460114 bytes）并带 `Cache-Control: private, no-store`。未审核文件没有被公开发布。

- 2026-08-31：关于瑞钧“发展历程里程碑”已完成共享记录的真实 PC 画布验收。工作台从 `关于瑞钧 -> 发展历程里程碑` 打开真实 Nuxt iframe 后，直接点击 `2006` 的事件文字，属性面板准确切换为 `milestones · event`、资料编号为 `timeline-2006`，而非保留初始 `1997` 记录或误写入页面草稿。临时文字“成立瑞钧机械（画布验收）”即时进入 iframe；保存后认证 Directus 回读确认 `milestones/3.event`，完整工作台重载后仍显示该值。恢复前再次认证读取确认服务器仍为测试值，随后从画布恢复“成立瑞钧机械（迁址昆山）”、保存、认证回读并完整重载确认无测试值残留。截图：`output/playwright/about-milestone-event-saved-20260831.png`。本项仅覆盖里程碑事件文字；时间轴图标和配图仍因 `media_assets=0` 保持只读。

- 2026-08-31：修复跨条目实时预览状态滞后。此前里程碑画布已从令牌初始的 `1997` 选择到 `2006`，内容与保存目标均正确，但 iframe 状态栏仍固定显示初始令牌标签，容易误导编辑者。先新增失败测试 `live preview status follows the currently selected related record instead of the token-start label`，再将受授权实时消息的 `collection/itemId` 保存为当前预览身份，并按同一安全记录白名单生成状态标签；会话切换时清空旧身份，避免旧条目残留。真实 PC 重载后状态栏已显示“2006 成立瑞钧机械（迁址昆山） · 正在同步未保存修改”。官网测试 `369/369` 与 Nuxt 生产构建通过；不改变 Nuxt 页面布局、预览权限或内容保存语义。

- 2026-08-31：发布、下线和版本恢复完成真实多角色 Directus 验收。先运行发布/恢复权限定向测试 `19/19`，再以随机临时账号验证：内容编辑者只能从草稿提交审核，审核者只能批准状态而不能篡改内容，发布者只能对已审核内容发布/下线/归档；编辑者不能修改已发布记录。恢复接口拒绝编辑者、要求发布者填写审计说明，并将历史版本恢复为 `draft/unpublished`，同时记录 `restored_from_version` 审计动作。发布演练创建的临时文章、媒体、文件、用户和版本均在脚本结束后清理并检查无残留：`temporaryDataCleaned=true`。这证明 P1-B 的角色权限、状态转换与回退闭环；公开端与授权预览端的同一条真实已发布内容隔离仍需在正式内容审批上线时再做联测。

- 2026-08-31：当前运行实例完成可视化工作台复核。工作台 `关于瑞钧 -> 发展历程里程碑` 的编辑表单、官网画布和属性面板在同屏三栏显示，不互相覆盖；选中 `2006` 条目后右侧属性面板命中 `milestones · event`，iframe 定位到相同时间轴节点。预览会话过期时，点击“重新连接实时预览”后状态栏恢复为“2006 成立瑞钧机械（迁址昆山） · 正在同步未保存修改”。截图：`output/playwright/workbench-about-timeline-reconnected-20260831.png`。该复核只确认当前页面和当前条目的可用性，不代表其它页面字段或正式媒体已完成。

- 2026-08-31：正式媒体治理从 `media_assets=0` 推进到首条真实候选素材闭环。新增 `cms/scripts/import-local-media-drafts.mjs`（`npm run media:import-local-drafts`）：仅允许读取工作区 `素材/` 内显式清单，默认只预检，`--apply` 才上传；记录强制为 `pending_review + draft + unpublished`，保留相对来源、用途、展示位、替代文本和审核说明，重复运行按来源路径跳过已有候选。导入前复用服务器展示位规格：`素材/产品/FL/1180.png` 为 `1000x800`，低于 `product.gallery.image` 的 `1200x900`，已在上传前跳过且无文件/资产残留；`素材/技术参数/FL/1180.png` 为 `1489x1419`，已创建 `media_assets/25` 草稿。认证 Directus 回读确认文件 `e9114535-eb8a-45f6-91eb-20d636b9bee8` 使用 `storage=s3`、尺寸/字节数一致，二次执行返回 `skipped_existing`；工作台“更多工具 -> 媒体资产”完整重载后显示该候选为“草稿”。截图：`output/playwright/media-asset-draft-visible-20260831.png`。此项不等于可替换或可发布：版权状态仍为待确认，必须经审核并在具体型号字段选择后才可进入页面替换闭环。

- 2026-08-31：本轮媒体导入工具和媒体治理定向测试 `21/21`、CMS 全量测试 `348/348` 均通过；本地运行时须使用项目 Node 22，`npm run runtime:verify` 结果为 `supported=true`、Directus 健康、24 个扩展均已构建。系统 Node 24 的检查结果不作为 CMS 运行时结论。

- 2026-08-31：产品尺寸参数图完成首批批量候选入库。导入清单严格限定为 `素材/技术参数/` 下 23 张 PNG；每张预检实际 PNG 宽高后才允许上传。二次 `--apply` 全部返回 `skipped_existing`，认证 Directus 汇总为 `23` 条、`draft:23`、`unpublished:23`、`pending_review:23`，逐条文件存储均为 `s3:23`，未创建重复记录。工作台“媒体资产”全量重载显示 23 条可见候选，并将素材标题作为主标题、原文件名作为辅助信息，`PRO1080 尺寸参数图` 与 `Y1080 尺寸参数图` 等同名文件不再混淆。截图：`output/playwright/media-asset-titled-20260831.png`。它们尚未关联到任何产品型号，也没有进入公开选择器；型号映射、版权确认、审核发布和单条页面替换仍须分别验收。

- 2026-08-31：补齐产品型号工程图区的画布媒体展示位声明。此前工程图已有真实字段路径 `configuration.drawings.{index}.media_asset_id`，但未声明 `product.gallery.image`，导致媒体模式无法按展示位收窄草稿候选。先新增失败断言，再只在受管理工程图节点增加 `data-cms-preview-placement-key="product.gallery.image"`；静态 PSD 兜底图仍然不携带字段路径，保持只读。Nuxt 定向回归 `71/71` 通过，运行中的 Nuxt 页面 `/product/fl1610`、Directus 和 MinIO 均返回 HTTP 200。由于自动化浏览器登录会话在刷新后失效，本项尚待一次已登录真实画布“点工程图 -> 右侧仅显示尺寸图候选 -> 替换后 iframe 即时更新”的复验；在该复验完成前，不计为完整媒体替换交付。

- 2026-08-31：产品型号工程尺寸图已完成真实已登录工作台的“选择候选 -> iframe 即时替换 -> 取消不落库”验收。路径为 `产品展示 -> 产品型号、参数与尺寸图 -> FL1610 -> 打开实时预览 -> 媒体 -> 工程尺寸图`。右侧属性面板准确命中 `product_models · configuration.drawings.0.media_asset_id`，候选列表仅显示 23 张 `product.gallery.image` 尺寸图草稿。选择 `media_assets/25` 后，iframe 图片地址从 `943fc0c6-faef-4209-a7d1-42dd5345d885` 即时更新为 `e9114535-eb8a-45f6-91eb-20d636b9bee8`，工作台同时启用“保存草稿”和“取消”。点击取消并确认后，认证 Directus 回读 `product_models/17.configuration.drawings=[]`，没有残留测试媒体关联。截图：`output/playwright/product-drawing-immediate-replace-20260831.png`。该闭环只允许内部预览使用未审核草稿媒体；保存后仍不能提交发布，直到媒体审核、版权确认和发布完成。

- 2026-08-31：服务支持首屏标题已完成真实 PC 画布的手工可逆验收。工作台进入 `服务支持 -> 服务支持首屏` 后，直接在 iframe 选中“售后服务”，属性栏准确显示 `pages · title`；设置横向偏移 `3%`、字号 `40px`、行高 `1.4`、颜色 `#123456` 后画布立即变化。点击“保存草稿”后，认证 Directus 回读确认 `pages/3.sections[id=hero].field_presentation.title` 为同一受控配置；点击“重新加载”后属性栏仍显示全部四个值。验证结束后仅删除该标题的测试 presentation 并认证回读 `field_presentation=null`，没有留下测试样式或改动 Nuxt 模板。该项不涵盖静态背景图替换。

- 2026-08-31：首页“三大特点”的首条可见理由 `pages/1.sections[id=performance].introTitle` 已完成真实 PC 画布闭环。验收中发现属性面板和 CSS 变量虽已更新，但首页旧 PSD 的带作用域 `!important` 标题规则压过通用 CMS 样式，导致实际计算颜色、字号和位移仍是默认值。先新增失败断言，再将覆盖范围收窄为 `#__nuxt .cms-field-presentation[data-cms-*-enabled="true"]`，仅对编辑者显式启用的字段提高优先级；未启用字段继续沿用原 PSD。画布中设置 `3% / 28px / 1.4 / #123456` 后，iframe 计算样式实际为 `rgb(18, 52, 86) / 28px / 39.2px / 3%`；保存、认证 Directus 回读及整页重载均一致，且相邻 `advanced-manufacturing` 未写入 presentation。结束后删除仅该字段的测试配置，重载确认恢复默认红色、`24.048px`、无位移。截图：`cms/.playwright-cli/page-2026-08-31T11-42-58-955Z.png`。该项不包含三大理由的静态图片替换。

- 2026-08-31：首页“三大特点”首条理由说明 `pages/1.sections[id=performance].introDetail` 已完成同一真实 PC 闭环，用于确认上述优先级修复并非只对 `<b>` 标题有效。画布点击“效能提升50%，丝损降低30%”后，属性栏精确显示 `pages · introDetail`；设置 `2% / 20px / 1.5 / #654321` 后 iframe 计算样式实际为 `rgb(101, 67, 33) / 20px / 30px / 2%`。保存、认证 Directus 回读和完整工作台重载均一致，且相邻 `advanced-manufacturing` 未写入同字段。结束后精确删除测试 presentation，重载确认回到 `rgb(17, 17, 17) / 16.56px / 无位移`。截图：`cms/.playwright-cli/page-2026-08-31T11-48-03-269Z.png`。不包含静态图片替换。

- 2026-08-31：产品型号 `product_models/17.configuration.features.0.label` 已完成真实 PC 画布的位置和文字样式闭环。根因是属性面板把 DOM 暴露的持久化路径 `configuration.field_presentation.features_0_label` 直接交给产品字段写入器；该写入器只接受可见字段路径 `configuration.features.0.label` 以创建受控的白名单 presentation，导致旧版本看似可编辑但草稿和 iframe 都保持默认值。现对产品功能点和工作站简介字段归一化到可见字段路径，并让右侧输入、拖拽、初始位置读取和工具栏居中共用这一规则；其它页面及产品型号编码仍使用原持久化路径。真实 Chrome 选中“\u4e94\u8f74\u6570\u63a7”后设为 `4% / 26px / 1.5 / #123456`，iframe 实际计算为 `rgb(18, 52, 86) / 26px / 39px`，保存后认证 Directus 仅回读 `product_models/17.configuration.field_presentation.features_0_label`，相邻 `15/16` 未被写入；完整工作台刷新、重新打开实时预览后仍读取相同样式。验收结束后删除该临时 presentation 并认证回读 `null`，未留下测试设计或修改 Nuxt 原布局。截图：`output/playwright/product-feature-live-preview.png`。

- 2026-08-31：修复“专注画布”模式空白。根因是实时预览在 `position: fixed` 且 `inset: 64px 0 0` 的情况下又被强制 `height: auto`，实际计算高度为 `0px`，因此表面上像被 Directus 宿主遮挡。先加入失败断言，再改为 `height: calc(100vh - 64px)`，不改变 Nuxt 页面、路由、PSD 布局或普通三栏工作台。扩展重建并重启 Directus 后，真实 Chrome 点击“专注画布”得到 `1280 x 656px` 预览区，工具栏和“退出画布”均可点击；退出后编辑表单重新出现。截图：`cms/.playwright-cli/page-2026-08-31T12-18-19-106Z.png`。CMS 定向测试 `41/41`、Directus 和 Nuxt HTTP 健康检查均为 `200`。

- 2026-08-31：产品型号跨条目预览复核完成。工作台切换到 `FL1390`（`product_models/16`）并在 iframe 选中第二项“`四轴螺距补偿`”后，属性面板准确绑定 `configuration.features.1.label`。临时将字号从 `20px` 改为 `27px`，真实文字 `<span>` 即获得 `data-cms-text-enabled="true"`、`--cms-text-size-desktop: 27px`、颜色和行高变量，确认预览已接收 FL1390 草稿且不是初始 FL1180 状态。此前的“未进入 iframe”结论来自误读取外层功能卡片而非文字节点，现已更正。点击“取消”后工作台显示“已取消未保存修改”，保存与取消均禁用，未写入 Directus。截图：`fl1390-feature-live-style.png`；CMS 定向回归 `50/50`，Directus `8055` 与 Nuxt `4175` HTTP 健康检查均为 `200`。

- 2026-08-31：收敛官网实时画布重复事件。根因不是首页字段缺少绑定，而是 `useCmsDraftPreview()` 同时被页面、页头、页脚和预览状态栏调用，每个实例都注册全局 `message/click/dblclick/pointer` 监听器；一次物理点击会向工作台送出 4 条相同的编辑请求，增加同步重复和误判风险。先在 `website/test/cms-live-preview.test.mjs` 写入失败断言，要求全局事件由单一共享桥接器处理；最小实现使用活动运行时所有者和模块级桥接器，仅当前挂载实例负责消息、选择和 MutationObserver，切换页面时移交给仍挂载实例。真实 Chrome 从“网站主页 -> 三大特点 -> 打开实时预览”对“30年技术沉淀，先进制造工厂”进行页面坐标物理点击后，仅收到 1 条 `pages/1/title/advanced-manufacturing` 请求，右侧属性栏显示 `pages · title`；截图：`output/playwright/home-single-message-selection-success.png`。网站定向测试 `70/70`、CMS 工作台定向测试 `41/41` 通过；Nuxt 生产构建因用户正在运行的开发服务器持有 Nuxt 锁而未执行，不以此伪称构建完成。未修改官网 Nuxt 结构、页面数据或测试内容。

- 2026-08-31：对上述单桥接器补做真实可逆保存回归，避免只凭“能选中”作为完成结论。工作台从“网站主页 -> 三大特点”打开实时预览，在侧栏画布可见区域点击 `pages/1.sections[performance].introTitle` 的“增效降损”；临时文案立即进入 Nuxt iframe，保存页面草稿后认证 Directus 回读为测试值，完整重载工作台并重新从画布选中后属性栏仍为测试值。随后通过同一属性栏恢复原文，再次保存并认证回读，未留下测试数据。截图：`output/playwright/home-performance-single-bridge-e2e.png`。侧栏默认 62% 缩放下横向场景可能只露出字段的一部分，自动化必须点实际可见坐标；这属于画布可用性改进项，不代表字段绑定或消息桥接失效。

- 2026-08-31：产品展示的 FL1610 型号编码完成真实 PC 画布可逆验收。工作台从“产品展示 -> 产品型号、参数与尺寸图 -> FL1610”打开实时预览，在 iframe 选中型号导航 `fl1610` 后，属性面板命中 `product_models · model_code`。临时输入 `fl1610-画布验收` 时，型号表单、画布导航和属性输入同步更新；保存后认证 Directus 回读 `product_models/17.model_code` 为测试值，且 `product_models/15/16` 保持 `fl1180/fl1390`。完整重新加载工作台后上述三个界面继续一致；随后用同一属性输入恢复 `fl1610`、保存、重载并完成最终认证回读，无测试文本残留。截图：`.playwright-cli/page-2026-08-31T14-00-49-231Z.png`。该项只证明型号编码的选择、预览、保存和恢复，不将产品图片、工程图、技术参数或公开发布计为完成。

- 2026-08-31：产品型号 `product_models/1.configuration.features.1.detail` 完成真实 PC 画布可逆验收，补上此前仅有自动化 API/预览合同的缺口。工作台进入“产品展示 -> 产品型号、参数与尺寸图 -> FR400XS (Auto)”并打开实时预览，直接点击“伺服张力控制”的说明后属性面板准确绑定 `product_models · configuration.features.1.detail`。临时修改为 `伺服张力控制说明-画布验收` 后，型号表单、iframe 和右侧属性输入即时同步；保存草稿后认证 Directus 回读仅变更 `product_models/1.configuration.features[1].detail`，同路径的 `product_models/2` 保持原文。点击“重新加载”后表单、画布和属性面板继续显示测试值；随后用同一属性面板恢复原说明、保存、再次重载并认证回读，无测试文本残留。字段级回归脚本 `cms/scripts/verify-product-model-auto-detail-preview.mjs` 同次通过，结果 `product_models/1/product-details`、`restored=true`。截图：`.playwright-cli/page-2026-08-31T14-10-40-907Z.png`。此项不涵盖特点图片、其它特点或产品媒体的替换。

- 2026-08-31：共享时间轴 `milestones/3.event` 完成真实 PC 画布可逆验收，解决台账中“仅自动化”与旧运行记录不一致的问题。先执行 `cms/scripts/verify-milestone-third-event-shared-preview.mjs`，确认 2006 事件通过授权预览同时出现在 `/about?cmsPreview=1` 与 `/?cmsPreview=1`，且 `milestones/1/2` 不被改写并在脚本末尾恢复。随后在工作台“关于瑞钧 -> 发展历程里程碑”切换至“2006 年 - 成立瑞钧机械（迁址昆山）”，从 iframe 直接选中事件文字，属性面板准确为 `milestones · event`。临时文案“成立瑞钧机械（共享画布验收）”即时同步至表单、画布和属性输入；保存后认证 Directus 回读只变更 `milestones/3.event`，完整重载仍保持。最后从同一属性输入恢复原文、保存、认证回读并重载确认无测试值残留。截图：`.playwright-cli/page-2026-08-31T14-14-53-998Z.png`。本项只覆盖事件文字；时间轴背景、图标和配图仍必须等待正式受治理媒体。

- 2026-08-31：补齐产品详情“技术参数侧边图”的媒体展示位声明。根因是该图片已绑定真实字段 `product_models.configuration.labels.technical_image_asset_id` 与媒体角色 `technical`，但缺少展示位键，媒体模式无法按规格筛选。复用既有 `product.gallery.image`（产品图或尺寸图）规格，只增加 `data-cms-preview-placement-key`，不改变 Nuxt 布局、图片 URL 或公开页行为。先新增失败 DOM 契约测试，再修复；`website/test/cms-live-preview.test.mjs` 全量 `72/72` 通过。真实已登录工作台在 `产品展示 -> 产品型号、参数与尺寸图 -> FL1610 -> 实时预览 -> 媒体` 点击该侧边图后，属性面板命中 `product_models · configuration.labels.technical_image_asset_id`，并只列出 23 个 `product.gallery.image` 草稿候选。未选择、保存、发布或改写任何素材；正式发布仍需版权确认和审核。

- 2026-08-31：产品详情“技术参数侧边图”完成真实 PC 工作台可逆保存闭环。沿用上述路径，选择内部预览草稿 `1610.png` 后，iframe 图片即时从 PSD 静态图替换为 Directus 资源地址；保存型号信息的 `PATCH /items/product_models/17` 返回 `200`，请求体精确写入 `configuration.labels.technical_image_asset_id = "27"`。工作台完整重载后，常规表单已正确显示 `1610.png · image/png（仅内部预览草稿）`，修复了旧版本只读取已发布素材而错误显示“沿用官网原图”的问题。最后重新选择“沿用官网原图”并保存；最终 `PATCH` 请求体确认 `technical_image_asset_id: null`，刷新后的下拉框仍为“沿用官网原图”。截图：`cms/.playwright-cli/page-2026-08-31T15-45-46-137Z.png`。该验证仅限受登录保护的内部草稿预览；23 个素材仍是 `pending_review + draft + unpublished`，不得据此宣称公开替换或发布完成。

- 2026-08-31：产品尺寸图候选选择器完成可用性修复。此前所有草稿只按原文件名列出，多个 `400.png`、`500.png` 无法区分，且与当前型号无关的候选会排在前面。新增独立的 `product-drawing-media` 规则与失败测试：仅当受治理素材标题明确包含当前型号编码时优先排序，全部其它合格候选仍保留；显示名改为“素材标题 · 原文件名 · MIME 类型”。规则不根据相近文件名或系列名称猜测映射，避免把 `FR400XS` 错配到其它 `400.png`。重建扩展、重启 Directus 后，真实工作台选择 `FL1610`，下拉首项为 `FL1610 尺寸参数图 · 1610.png · image/png（仅内部预览草稿）`，其后才是其它型号候选。新单测 `3/3`、工作台回归 `42/42` 通过；截图：`cms/.playwright-cli/page-2026-08-31T15-51-25-690Z.png`。本项仅提升内部草稿编辑的正确性，不改变公开 Nuxt 页面、数据或发布状态。

- 2026-09-01：产品型号跨条目工作台补充真实 PC 可逆验收。先从实时画布 `FL1610 (product_models/17)` 切换到 `FL1390 (product_models/16)`；表单型号编码、画布工具栏标题、iframe 页面标题和技术参数均同步为 `FL1390`，旧属性面板为零。随后在 iframe 重新选中“`五轴数控`”，属性面板精确命中 `product_models · configuration.features.0.label`。临时文案 `FL1390-画布保存验收-20260901` 即时进入画布，点击“保存草稿”后经当前已登录 Directus 会话受保护回读确认仅 `product_models/16` 的该字段为测试值；完整刷新工作台、重新进入产品型号区块并重新打开画布后仍可选中该测试值。最终由同一属性面板恢复“`五轴数控`”，保存后认证回读 `id=16`、`model_code=fl1390`、字段原文已恢复。截图：`output/playwright/product-model-switching-FL1390-desktop-20260901.png`。同轮定向回归 `48/48`，并运行 `cms/scripts/verify-product-model-third-record-preview.mjs` 自动恢复 `product_models/17`。本项只补强跨记录防串写，不将工程图、产品媒体或公开发布计为完成。

- 2026-09-01：修正普通产品型号的虚假编辑入口。事实：`FL1390` 等 `series_code !== workstation` 的官网画布只渲染“型号导航与核心能力”，此前工作台仍展示“工作站介绍与设备主图”的输入区，会产生“CMS 可填但官网没有展示位”的错误预期。先增加失败回归，再最小化调整为仅 `series_code === workstation` 显示该编辑区；普通型号改为只读说明“当前型号在官网使用‘型号导航与核心能力’模板，没有工作站介绍展示位”。扩展重建并重启 Directus 后，真实登录浏览器在“产品展示 -> 产品型号、参数与尺寸图 -> FL1390”确认型号编码为 `fl1390`、仍可编辑参数与特点、页面中不存在介绍标题输入框且只显示上述说明。定向工作台回归 `46/46` 通过。截图：`output/playwright/product-model-FL1390-template-correction-20260901.png`、`output/playwright/product-model-FL1390-template-notice-20260901.png`。本项不改 Nuxt 的公开画面或数据，也不将所有产品字段视为已完成画布验收。

- 2026-09-01：首页“三大特点”第二条首屏理由标题 `pages/1.sections[advanced-manufacturing].introTitle` 补齐真实 PC 画布位置/文字样式闭环。先打开“网站主页 -> 三大特点”实时预览，直接点击首屏列表的“先进智造”，属性面板准确命中 `pages · introTitle`，而非同名横移导航或横移标题。临时改为“先进智造-画布样式验收”，并从属性面板设定横向偏移 `3%`、字号 `30px`；表单与 Nuxt iframe 均即时同步。通过工作台“保存草稿”后，认证 Directus 回读确认页面仍为 `draft/unpublished`，且仅此字段保存 `field_presentation.introTitle.layout.desktop.offset_x=3`、`text_style.size_desktop=30`。完整工作台重载后表单、画布和属性面板继续显示相同值。恢复阶段先由工作台恢复文字与数值，再经受保护 API 仅删除本次新增的 `field_presentation.introTitle`，避免留下默认数值形式的样式残留；最终回读 `introTitle=先进智造`、presentation 为 `null`，重载后画布恢复默认计算样式。模块回归 `46/46` 及 `verify-homepage-reason-intro-title-presentation-preview.mjs` 均通过并恢复。截图：`output/playwright/home-advanced-manufacturing-intro-title-style-20260901.png`、`output/playwright/home-advanced-manufacturing-intro-title-restored-20260901.png`。未改变 Nuxt 公开布局、动画或媒体状态。

- 2026-09-01：产品型号能力图片位置编辑完成代码、测试和真实 PC 可逆验收。`configuration.features.{index}.image` 已加入受控字段、展示路径白名单及 Nuxt 图片节点的独立绑定；在“产品展示 -> 产品型号、参数与尺寸图 -> FL1610”临时为首项能力关联内部预览草稿 `media_assets/27`，iframe 立即出现“`五轴数控`”图片。点击图片后，属性面板精确命中 `product_models/17 · configuration.features.0.image`，设置水平/垂直偏移 `18/12` 后画布即时更新；保存后受保护 Directus 回读确认 `media_asset_id=27`、`field_presentation.features_0_image.layout.desktop.offset_x=18`、`offset_y=12`，完整重载后工作台仍显示相同关联和位置。随后恢复为 `media_asset_id=null`、`offset_x=0`、`offset_y=0`，再次认证回读确认无测试值残留。该素材仍是 `pending_review + draft + unpublished`，本项只证明登录后台的内部草稿预览与持久化链路，不代表公开媒体替换或发布完成。CMS `368/368`、Website `377/377` 通过。

- 2026-09-01：修复先进制造“生产核心设备”的按钮式图片层无法进入媒体编辑的问题。事实：Nuxt 的透明点击层是 `button`，但其受控路径为 `pages/8.sections[core-equipment].media.0`；旧工作台把所有按钮优先当作文字，导致媒体模式仍显示 JSON“文字内容”。现在仅将明确的 `media.{index}` 按钮路径识别为媒体位，不放宽普通 CTA。先以失败单测锁定，再通过工作台定向测试 `71/71`、扩展重建和 Directus 重启；真实 PC 工作台进入“先进制造 -> 生产核心设备 -> 打开实时预览 -> 媒体”，点击“平面磨床”后属性面板显示正确源路径和“媒体替换”，仅列出 `equipment-1.png` 内部草稿候选。未选择、保存或发布素材；该项只证明替换控件可用，不代表多个设备图片或公开媒体已完成。截图：`output/playwright/manufacturing-core-equipment-media-selected-20260901.png`。

- 2026-09-01：修复内容编辑工作台在 `1280-1599px` 桌面宽度下的实时预览可用性。事实：此前 1440px 浏览器实际将表单、画布和属性面板同时压缩，画布仅约 320px，不能作为可视化编辑器使用。现在实时预览打开时保留左侧 CMS 栏目导航，将编辑表单暂时从该行移除并让画布跨越剩余网格；表单不卸载，关闭实时预览后恢复。先以失败测试锁定规则，模块测试 `55/55` 通过；扩展重新构建、Directus 重启后，1440px 真实浏览器测得预览宽度 `892px`、高度 `836px`。点击 `FL1180` 型号编码后属性面板正确命中 `product_models/15 · model_code`，画布与属性栏同时可用。未修改 `website/` 的 Nuxt 页面、公开版式、路由、PSD 坐标或动画。截图：`output/playwright/workbench-medium-desktop-canvas-1440-20260901.png`、`output/playwright/workbench-medium-desktop-canvas-property-1440-20260901.png`。

- 2026-09-01：服务支持第 3 张服务入口卡片 `pages/3.sections[support-actions].items.2.title`（“服务流程与寄修”）完成真实 PC 可逆闭环。工作台从“服务支持 -> 服务入口”打开实时预览，iframe 点击卡片标题后属性面板显示完整来源路径；临时改为“服务流程与寄修-画布验收”后即时进入 Nuxt iframe，保存草稿后受保护 Directus 读取返回 `HTTP 200`、`draft/unpublished` 及同一测试值。点击工作台“重新加载”后，iframe 与属性面板仍保持该值；随后从同一属性面板恢复原文并保存，认证读取确认已恢复。截图：`output/playwright/service-support-action-third-title-restored-20260901.png`。本项仅覆盖卡片标题文字，不将静态图案、未托管图片或公开发布计为完成。

- 2026-09-01：先进制造“生产核心设备”完成首个真实不同图片的可逆媒体替换验收。此前不是没有设备图，而是三张来自 `素材/先进制造/先进制造(1).psd` 的现有设备图层未进入受治理候选库；同时三张实际尺寸为 `740x415`，原 `740x416` 最低规格会错误拒绝官网现用素材。规格已按源图修正为最低 `740x415`，四张来源明确的候选均导入为 `pending_review + draft + unpublished`（资产 51 至 54），不会公开发布。真实 PC 画布路径为“先进制造 -> 生产核心设备 -> 打开实时预览 -> 媒体 -> 平面磨床”：选择素材 52 后，属性面板的 `pages/8.sections[core-equipment].media.0` 即时从 `50` 更新为 `52`，iframe 按钮文案同步为“立式加工中心”；保存、工作台重新加载后仍为素材 52。随后选择 50 并保存，预览和字段值均恢复“平面磨床”。定向治理与导入测试 `21/21` 通过，Directus `/server/health` 返回 `{"status":"ok"}`。本项仅证明登录后台的草稿预览、保存和恢复；候选仍需版权和发布审核，不能计为官网公开换图。

- 2026-09-01：补齐页脚品牌图的真实 PC 画布选中路径。发现两个独立根因：视觉编辑模式下透明文字容器会覆盖底图命中区；以及页脚品牌图使用受控媒体角色 `logo`，但实时预览安全白名单遗漏该固定角色。新增失败测试后，保持文字本身可编辑、容器继续不接收鼠标事件，并只把 `logo` 加入既有受控媒体角色列表，未放宽任意角色或 URL。真实 Chrome 在“高级设置 -> 全站设置 -> 打开实时预览 -> 媒体”点击页脚品牌图后，属性面板准确显示 `site_settings/1 · brand.footer_logo_asset`；当前没有符合品牌展示位的受治理素材，因此明确显示“待媒体”，没有伪造替换候选或写入草稿。截图：`.playwright-cli/page-2026-09-01T08-34-59-421Z.png`。网站定向测试 `82/82`，工作台扩展构建通过；官网 HTTP `4175` 与 CMS HTTP `8055` 均为 `200`。不改变 Nuxt 的公开布局、路由、PSD 坐标或动画。

- 2026-09-01：页脚三枚联系图标完成真实 PC 画布选中验收。图标原本未提供辅助名称，且电话、邮箱上方各有公开站点链接层；已限定为仅视觉编辑模式下让具备明确字段路径的图标接收指针，公开链接层在编辑模式下不再截获点击。真实 Chrome 的屏幕坐标点击依次选择 `footer.address_icon_asset`、`footer.phone_icon_asset`、`footer.email_icon_asset`，右侧属性面板每次均准确显示 `site_settings/1` 与对应字段，最后邮箱图标截图为 `output/playwright/footer-contact-icons-verified.png`。网站定向回归 `82/82` 通过，工作台扩展重新构建通过。当前三个展示位均无符合规格的受治理候选素材，因此显示“待媒体”；本项只证明画布选择和受控替换入口，不代表素材替换、保存或公开发布已完成，且未改动 Nuxt 公开布局、PSD 坐标、路由或动画。

- 2026-09-01：首页“三大特点”总标题 `pages/1.sections[why-ruijun].title` 完成真实 PC 画布可逆闭环。工作台路径为“网站主页 -> 三大特点 -> 打开实时预览”；在 Nuxt iframe 直接选中“选择瑞钧的三大理由”后，属性面板精确显示 `pages/1 · sections[why-ruijun].title`。临时修改为“选择瑞钧的三大理由-画布验收”后立即同步到 iframe；保存草稿返回 `PATCH /items/pages/1 HTTP 200`，认证回读确认仅该路径为临时值且页面保持 `draft/unpublished`。点击“重新加载”后，画布及属性栏仍为保存值；随后从同一属性栏恢复原文、保存并再次重载，最终页面和属性栏均恢复“选择瑞钧的三大理由”。截图：`output/playwright/homepage-why-ruijun-title-restored-20260901.png`。三条个别理由仍受 `requires_claim_review=true` 约束，未绕过审核进行编辑；本项未发布内容，也未改变 Nuxt 公开布局、PSD 坐标、路由或动画。

- 2026-09-01：首页“产品系列展示图”总标题 `pages/1.sections[products].title` 完成真实 PC 画布可逆闭环。工作台路径为“网站主页 -> 产品系列展示图 -> 打开实时预览”；在 Nuxt iframe 直接选中标题的红色“产品”文字后，属性面板准确显示 `pages/1 · sections[products].title`。临时改为“我们的产品-画布验收”立即进入画布，工作台“保存草稿”触发 `PATCH /items/pages/1 HTTP 200`；受保护请求体确认该字段为验收值且页面仍为 `draft/unpublished`。点击“重新加载”后，iframe 与属性栏继续显示验收值；随后恢复“我们的产品”、保存并重载，最后一次受保护请求确认原文已恢复，截图：`output/playwright/homepage-products-title-restored-20260901.png`。网站定向字段回归 `13/13` 通过；未发布内容，也未改变 Nuxt 公开布局、PSD 坐标、路由或动画。

- 2026-09-01：首页“产品系列展示图”英文标识 `pages/1.sections[products].kicker` 完成真实 PC 画布可逆闭环。该 CMS 字段原本为空，Nuxt 画布按原设计显示默认回退“`Our product`”；直接点击该文字后属性面板精确命中 `pages/1 · sections[products].kicker`，不是同区块标题。临时写入“`OUR PRODUCT-画布验收`”即时更新画布，保存草稿后 `PATCH /items/pages/1 HTTP 200`；重新加载后属性栏与 iframe 仍显示验收值。恢复时将字段清空、保存并重载，官网恢复默认“`Our product`”，未留下测试文字。截图：`output/playwright/homepage-products-kicker-restored-20260901.png`。本项只验证文字绑定与草稿持久化，不将产品封面素材替换或公开发布计为完成。

- 2026-09-01：首页“选型咨询”正文 `pages/1.sections[product-task].body` 完成真实 PC 画布可逆闭环。直接在 Nuxt iframe 点击“通过工件、精度、节拍和自动化需求获得选型建议。”后，属性面板精确命中 `pages/1 · sections[product-task].body`。临时追加“画布验收”即时进入画布，保存草稿后重载工作台仍显示测试正文；随后恢复完整原文、保存并重载，画布和属性栏均恢复。截图：`output/playwright/homepage-product-task-body-restored-20260901.png`。本项不改变关联 CTA 链接、默认样式、公开布局或发布状态。

- 2026-09-01：首页“选型咨询”CTA 文案 `pages/1.sections[product-task].label` 完成真实 PC 画布可逆闭环。画布点击“获取选型建议”后，属性面板精确命中 `pages/1 · sections[product-task].label`，并同时显示其独立按钮链接字段；验收过程没有修改链接。原 CMS 字段为空、官网按设计回退显示“获取选型建议”。临时填入“获取选型建议-画布验收”后立即更新 iframe，保存并重载后测试值仍在；随后清空字段、保存并再次重载，官网恢复默认文案，未留下测试值。截图：`output/playwright/homepage-product-task-label-restored-20260901.png`；对应首页字段绑定回归 `1/1` 通过。未发布内容，也未变更 Nuxt 公开布局、路由或默认交互。

- 2026-09-01：修复首页“选型咨询”顶部英文标识无法在 CMS 编辑的真实缺口。事实：Nuxt 原模板将“`RUIJUN MEDIUM SPEED WIRE EDM`”硬编码，`pages/1.sections[product-task].kicker` 虽存在于草稿却从未渲染或提供画布路径；同时当前草稿旧值为“`...WIRE CUT`”，与改造前 Nuxt 可见文案冲突。TDD 先新增失败断言，要求 `kicker` 具有独立 `fieldPresentationAttributes`、画布字段路径和位置样式路径；最小修复将该节点绑定到受控 `productTask.kicker`，空值回退仍为改造前的“`...WIRE EDM`”，不改版式。定向测试先失败、修复后 `2/2` 通过。真实 PC 画布点击英文标识精确命中 `pages/1 · sections[product-task].kicker`；临时改为“`RUIJUN CMS KICKER-画布验收`”即时同步，保存及工作台重载后仍保留。恢复阶段没有猜测新业务文案，而是将草稿值对齐为改造前官网原文“`...WIRE EDM`”，保存重载后仍一致。截图：`output/playwright/homepage-product-task-kicker-restored-20260901.png`。这只解决字段可编辑性与既有官网/CMS 文案不一致；是否改为其它正式营销用语仍需业务确认，未发布内容。

- 2026-09-01：服务支持首屏英文标识 `pages/3.sections[hero].kicker` 完成真实 PC 画布可逆闭环。工作台当前预览切换到“服务支持”后，直接选中 iframe 中的“`SERVICE SUPPORT`”，右侧属性面板准确显示 `pages/3 · sections[hero].kicker`，可调整文字内容、水平/垂直偏移、字号、字重、行高与颜色。临时改为“`SERVICE SUPPORT - Canvas Test`”后，Nuxt iframe 立即同步；保存草稿后工作台提示“页面草稿已保存”，点击“重新加载”仍显示该值。随后从同一属性面板恢复“`SERVICE SUPPORT`”、保存并重载，画布恢复原文，未留下测试文字。截图：`output/playwright/service-hero-kicker-restored-20260901.png`。本项只证明首屏英文标题文字与受控样式的画布编辑、草稿持久化和恢复；首屏背景、按钮图案及其它媒体仍须独立治理和验收，未发布内容，也未修改 Nuxt 公开布局、路由、PSD 坐标或动画。

- 2026-09-01：修复画布切换页面时左侧二级栏目仍停留在旧页面的问题。根因是 `activateVisualEditingTarget()` 仅切换页面草稿和 iframe，未按页面 `slug` 更新 `siteArea`，导致画布显示“服务支持”而左侧仍显示“网站主页内容”。先新增失败回归 `canvas page selection keeps the website-area navigation aligned with the selected page slug`，再增加受限的 `syncSiteAreaForPage()`，只接受既有六个官网栏目 slug。工作台模块回归 `64/64` 通过，扩展重建并重启 Directus 后，真实 Chrome 从画布条目下拉“服务支持 -> 网站主页 -> 服务支持”验证：画布标题和左侧二级菜单分别同步为对应首页五项、服务支持七项。截图：`output/playwright/workbench-area-menu-sync-service-20260901.png`。本修复只改 CMS 工作台状态，不触碰 Nuxt 公开布局、路由、PSD 坐标、动画或网站数据。

- 2026-09-01：先进制造“CNC车间”实际说明 `pages/8.sections[precision-machining].description` 完成真实 PC 画布可逆闭环。既有绑定回归 `website/test/visual-binding-paths.test.mjs` 证明该 PSD 文字稳定指向 `precision-machining/description`，无需为已覆盖契约重复改动生产代码。真实 Nuxt iframe 选择“自动化数控设备替代了传统的机械加工，拥有 100 多台套加工母机”后，属性面板精确显示完整来源路径；临时在第二行追加“（画布验收）”立即反映到画布。保存草稿后，受保护 Directus 读取确认 `pages/8` 仍为 `draft/unpublished` 且同一路径保存测试值；工作台重新加载后画布和属性栏保持。随后按读取到的原始两行文案恢复、保存和重载，最终受保护读取确认无测试文字残留。截图：`output/playwright/manufacturing-cnc-description-restored-20260901.png`。本项仅覆盖 CNC 说明文字，不将关联静态设备图、其它制造分区或公开发布计为完成。

- 2026-09-01：产品展示“三大指标”首条说明 `pages/7.sections[proof-efficiency].body` 完成真实 PC 画布可逆闭环。工作台在“产品展示 -> 三大指标”中从 Nuxt iframe 直接选中“效能提升50%，丝损降低30%”，属性面板精确显示该来源路径。临时改为“效能提升50%，丝损降低30%（画布验收）”后立即同步到画布；保存草稿后，认证工作台请求 `PATCH /items/pages/7` 返回 `HTTP 200`，返回记录仍为 `draft/unpublished` 且同一路径保存测试值。点击“重新加载”后，iframe 与属性面板继续显示该值；随后恢复完整原文、保存并重载，画布和属性面板均恢复原文，未找到测试文字残留。截图：`output/playwright/product-proof-efficiency-live-20260901.png`、`output/playwright/product-proof-efficiency-restored-reload-20260901.png`。本项只覆盖这一条说明文字，`requires_claim_review=true` 的宣传数据仍须走审核流程，未发布内容，也未改变 Nuxt 公开布局、PSD 坐标、路由或动画。

- 2026-09-01：产品展示“三大指标”其余两条实际说明也完成真实 PC 可逆闭环。Nuxt iframe 依次选中“30年技术沉淀，先进智造工厂”和“销量持续领先，品质始终如一”，属性面板分别精确显示 `pages/7 · sections[proof-years].body` 与 `pages/7 · sections[proof-champion].body`。两项临时追加“（画布验收）”均立即进入画布；各自保存草稿、重新加载后仍保留测试值，随后恢复完整原文、保存并重载。最终画布和属性面板均是原文，且工作台中不存在“画布验收”残留。截图：`output/playwright/product-proof-years-restored-reload-20260901.png`、`output/playwright/product-proof-champion-restored-reload-20260901.png`。三项宣传说明均保留 `requires_claim_review=true`，未绕过审核或发布；本项不代表产品指标数值、单位、产品图片或参数分组标题已完成。

- 2026-09-01：产品详情参数分组标题完成真实 PC 画布保存闭环，并修复与发布流程的规则冲突。事实：同一分组名称分散保存在多条 `product_parameters` 记录中，单条改名会把官网参数表拆成多个分组；画布现将“运动参数”绑定为 `product_parameters/94 · group_name`，明确提示会同步当前型号的 2 项参数，且不允许为汇总标题单独写位置或样式。验收中临时改为“运动参数-验收”，Nuxt iframe 立即同步，首次保存被发布工作流正确拒绝（该工作流只允许单记录更新）。修复后工作台仍保持一次“保存草稿”操作，但向两条受控参数逐条发出版本审计更新，而非放宽全局批量写入权限；重建扩展并重启 Directus 后，同一画布保存提示“技术参数分组已同步保存（2 项）”。认证回读确认两条记录均曾保存测试标题；恢复阶段以精确断言确认测试标题剩余 `0` 条、原“运动参数”恢复 `2` 条，并通过“重新连接实时预览”确认 iframe 两项同组显示恢复。截图：`output/playwright/product-parameter-group-saved-success-20260901.png`、`output/playwright/product-parameter-group-final-restored-20260901.png`。定向回归：CMS `65/65`、网站 `82/82`。本项只覆盖同型号参数分组名称；参数字段、数值、单位、图片、公开发布和其它型号仍须分别验收。

- 2026-09-02：首页“三大特点”横移第二、第三项预览定位修复并完成真实 PC 验收。根因是横移大标题的 `data-reason-slide` 位于外层 `article`，预览跳转逻辑只读取被选中 `h2` 自身属性；同时同一理由绑定同时出现在首屏列表和横移展示，`querySelector()` 会优先命中列表。先新增失败回归，要求使用 `querySelectorAll()`、优先选择 `#reason-showcase [data-reason-slide]` 候选，并从最近的 `[data-reason-slide]` 父级读取索引；最小修复已完成。服务重启后，认证工作台“网站主页 -> 三大特点 -> 打开实时预览”中选择横移第二项后 iframe 状态为 `slide=1`、第三项为 `slide=2`，右侧属性路径分别准确显示 `pages/1 · sections[advanced-manufacturing].title`、`pages/1 · sections[industry-leadership].title`。临时修改第三项标题后 iframe 立即更新为“第三项预览验证”，恢复为“产品销量稳居全国第一”后保存/取消均回到禁用，未留下测试数据。截图：`output/playwright/home-preview-horizontal-target.png`。定向网站回归 `89/89` 通过；CMS 与 Nuxt 健康检查均为 `200`。本项只修复横移目标定位，不将六页全量 Visual Editing 宣称完成。

- 2026-09-02：页脚采购区文字拆分为独立可视化字段，保持原 PSD 坐标和公开布局不变。此前共享页脚与先进制造嵌入页脚将“你有量 / 我有价”拼为单个 `purchase-copy` 节点，导致 CMS 无法分别选中并编辑 `footer.purchase_title`、`footer.purchase_subtitle`。TDD 先新增失败断言，再将两套渲染拆为 `purchase-copy-title` 与 `purchase-copy-subtitle` 两个文本节点，分别绑定上述字段；第二行沿用原画布行距，仅增加独立字段路径。页脚相关网站定向回归 `20/20` 通过；真实 Chrome 在 Nuxt `4175` 首页查询到四个采购字段，路径准确为 `footer.purchase_label`、`footer.purchase_title`、`footer.purchase_subtitle`、`footer.purchase_phone`，可分别被工作台选中。该项尚未进行临时文案保存/回读，不计入采购字段完整可逆验收；未修改 Nuxt 原布局、路由、动画或公开数据。

- 2026-09-02：服务支持“在线售后服务”AI 服务台补齐 10 个真实可视化文本绑定：`content.assistant_brand`、`assistant_heading`、`assistant_intro`、`assistant_cta` 以及三步流程的 `step_1/2/3_title/body`。此前这些文本虽在 CMS 表单中可填、且 Nuxt 通过 `supportCopy()` 渲染，却没有画布字段路径，无法直接点击选择；同时预览安全清洗器会丢弃这些嵌套内容，造成即使修改草稿也可能在 iframe 回退到默认文案。TDD 先新增两组失败断言（Nuxt 可见字段绑定、CMS 预览清洗保留并排除 `private_note`），再在真实渲染节点增加字段与独立 presentation 路径，并将清洗白名单扩展至现有受控服务文案集合。CMS 预览 `16/16`、网站实时预览与服务页 `104/104` 通过；真实 Nuxt `/service` 查询确认 10 个节点均有准确 `content.*` 路径。Directus 重启后当前工作台的实时预览 iframe 未挂载 URL，虽令牌已签发/消费，仍无法进行本轮“画布点击 -> 保存 -> 重载 -> 恢复”浏览器闭环；因此该项仅记为绑定和预览数据契约完成，不能宣称完整可逆验收。未改 Nuxt 原布局、路由、动画或公开内容。

- 2026-09-02：修复实时预览通过隐藏表单 POST 导航时的 iframe 空白风险，并完成重启后真实 PC 工作台复核。根因是 `submitPreviewToken()` 在 `form.submit()` 后同步移除表单，部分 Chromium 时序下可能取消目标 iframe 的跨文档导航；同时 iframe 通过表单目标导航时不会回写 `iframe.src` 属性，不能把 `src === null` 当作加载失败。TDD 先增加回归断言，要求表单提交后使用下一事件循环再清理，禁止同步 `form.remove()`；最小修复为 `window.setTimeout(() => form.remove(), 0)`，不改预览接口、Nuxt 布局或路由。重启 Directus 后真实工作台进入“服务支持 -> 瑞钧支持”，点击“打开实时预览”，约 1.6 秒内 iframe 实际 frame URL 为 `http://127.0.0.1:4175/service?cmsPreview=1`，Nuxt 页面正文正常渲染，工作台状态显示“实时同步”；CMS 工作台回归 `66/66`、CMS 全量 `407/407`、Website 全量 `396/396` 通过。截图：`output/playwright/visual-editor-service-live.png`。该修复解决预览挂载稳定性，但不把服务支持 10 个字段或六页整体 Visual Editing 宣称完成；在线售后服务字段仍需继续完成“画布点击 -> 保存 -> 重载 -> 恢复”闭环。

- 2026-09-02：修复服务支持 AI 服务台“有字段路径但无法在画布操作”的真实缺口。检查发现在线服务台的 10 个字段虽然已经标记 `data-cms-preview-field-path`，但当前服务页 PSD 主布局使用 `.service-page>.online-service{display:none}` 隐藏了旧版在线服务区，导致所有节点计算尺寸为 `0 x 0`，无法被编辑者点击；因此此前“字段已绑定”不能视为 Visual Editing 可用。TDD 先增加失败断言，明确公开布局保持隐藏、仅 `html[data-cms-preview-edit-mode="true"]` 显示该受控区块；并扩展工作台水合逻辑，为 `online_*`、`assistant_*` 和三步说明保留既有值、仅补真实 Nuxt fallback，避免属性栏读空或拒绝写入。定向 CMS 回归 `91/91`、服务页定向回归 `27/27` 通过，扩展重建且 Directus/Nuxt 均重启。真实 PC 工作台从“服务支持 -> 瑞钧支持 -> 打开实时预览”验证：区块在编辑模式计算为 `1440 x 682.47`，`content.assistant_brand` 为 `564.22 x 19.8`；直接点击后属性栏精确显示 `pages/3 · sections[support].content.assistant_brand`，临时值即时进入 iframe。验收中一度保存测试标记，已通过认证 Directus API 恢复 `RUIJUN AI SERVICE DESK` 并回读确认，不留测试文案。公开官网继续隐藏该备用区块，未改变 PSD 可见布局。该项完成“可见、可选、即时同步、数据回填”；完整的工作台保存 -> 重载 -> 恢复闭环尚需作为下一项继续，不能计为全部 10 个字段完成。

- 2026-09-02：服务支持 AI 服务台 `content.assistant_brand` 完成真实 PC 可逆闭环。工作台刷新后选中该字段，临时改为 `RUIJUN AI SERVICE DESK - TDD`，画布立即同步；点击“保存草稿”成功，重新加载后属性栏与 iframe 仍保持临时值；随后恢复为 `RUIJUN AI SERVICE DESK`、再次保存和重载，最终画布与属性栏均恢复原值。此前一次错误的局部 `sections` PATCH 曾暴露 Directus 对该字段的整体替换语义，已从版本快照恢复页面 3 的完整 5 个区块，并通过认证 API 回读确认 `hero,support,support-models,support-actions,office-directory` 均存在。该项证明保存、重载和恢复链路可用，不代表服务台其它 9 个字段或媒体已全部完成，也未发布草稿。

- 2026-09-02：页脚采购区四个字段均在真实 Nuxt PC 画布中可单独选中：`footer.purchase_label`、`footer.purchase_title`、`footer.purchase_subtitle`、`footer.purchase_phone`。其中 `footer.purchase_title` 完成“临时修改 -> 即时画布同步 -> 保存草稿 -> 工作台重载 -> 恢复原值”的真实闭环，最终恢复为“你有量”。CMS 全量测试 `408/408`、Website 全量测试 `397/397` 通过，CMS `8055` 与 Nuxt `4175` 健康检查均返回 `200`。本项不代表页脚媒体替换或六页整体 Visual Editing 完成。

- 2026-09-02：页脚采购区剩余三个字段 `footer.purchase_label`、`footer.purchase_subtitle`、`footer.purchase_phone` 完成真实受保护预览、保存、认证回读和原值恢复脚本验收；并将四字段统一纳入 `cms/scripts/verify-footer-purchase-fields-preview.mjs` 与 `visual:verify-footer-purchase-fields`。脚本逐项 PATCH `site_settings/1.footer`，签发预览令牌后通过 Nuxt `/api/preview/open` 检查首页实际 HTML，再恢复完整 footer 快照；运行结果为四字段全部验证、`restored=true`，记录保持 `draft/unpublished`。新增 CMS 回归测试通过。该项补齐采购区字段级保存/回读证据，不代表页脚图标、品牌图或审核发布完成。

- 2026-09-02：服务支持“在线售后服务”画布继续完成 5 个可逆字段闭环：`content.assistant_heading`、`content.assistant_intro`、`content.assistant_cta`、`content.step_1_title`、`content.step_1_body`。每项均在真实 PC 工作台从“服务支持 -> 瑞钧支持 -> 打开实时预览”直接点击对应画布节点，临时文字立即同步；保存草稿、点击“重新加载”、重新从画布选中后仍读取测试值；随后恢复原文、再次保存和重载确认无测试文案残留。按钮验收按实际可见文本校验，保留模板固定箭头；多行标题验收按原始文本节点校验，避免把浏览器换行折叠误判成同步失败。认证 Directus 回读确认页面仍为 `draft/unpublished`，服务台十个字段中第 2、3 步流程尚待逐项同标准验收，不能以本批结果宣称全部完成。CMS 工作台与字段回归 `91/91`、网站实时预览与服务页回归 `105/105` 通过。

- 2026-09-02：服务支持在线服务台剩余 `content.step_2_title`、`step_2_body`、`step_3_title`、`step_3_body` 四个字段完成真实 PC 可逆闭环；连同此前批次，在线服务台 10 个核心助手文案均已逐项完成画布点击、即时同步、保存草稿、重载复核和恢复原文。另修复全站 PSD 页脚电话两行的可视化绑定缺口：原实现将“热线 / 外贸”合并为 `contacts.domestic_phone`，现按原坐标拆为 `phone-domestic -> contacts.domestic_phone` 与 `phone-export -> contacts.export_phone` 两个节点，保留旧电话样式配置兼容、点击区域和公开布局不变。真实 Chrome 在新 Nuxt 运行时中分别对两个电话字段完成临时值同步、保存、重载和恢复；认证 Directus 回读原值分别为 `150 5016 6844` 与 `17751119936`。TDD 先失败后通过，页脚/预览定向回归 `85/85`；服务台与网站实时预览回归 `105/105`。本项仍不代表六页所有媒体、图库和发布流程已完成。

- 2026-09-02：完成服务支持 AI 服务台余下 4 项流程字段的真实 PC 可逆验收：`content.step_2_title`、`content.step_2_body`、`content.step_3_title`、`content.step_3_body`。每项均通过画布直接选择、即时同步、草稿保存、完整重载后重新选择、恢复原文和再次重载；页面维持 `draft/unpublished`，认证 Directus 回读无验收残留。Nuxt 重启后复核全站 PSD 页脚电话拆分，`contacts.domestic_phone` 与 `contacts.export_phone` 现在可分别选中并完成同样闭环。全量 CMS 回归 `408/408`、Website 回归 `397/397`，CMS 与 Nuxt 健康检查均为 `200`。服务支持文本闭环已完成，但该页面的图标、背景及其它正式媒体仍受媒体治理和发布审核约束。
- 2026-09-02：先进制造 `CNC车间` 完成一条真实 PC 草稿媒体替换闭环。核实当前媒体资产库有 59 条记录，其中 `manufacturing/precision-machining` 有 6 条准确对应 CNC 图层的私有草稿素材；工作台“先进制造 -> CNC车间”只显示这 6 条候选。选择 `CNC车间主设备图`（`media_assets/56`）并填写展示位置 `cnc-main` 后保存，认证工作台提示已进入版本审计。打开实时预览，画布中“CNC龙门加工中心”节点绑定为 `pages/8 · sections[precision-machining].media.0`，实际图片源为受保护的 CMS 文件 `/assets/eb72e291-cc16-4e31-baa0-9117567d00a2`，不是静态 PSD fallback；重新加载工作台后关联仍存在。随后从同一编辑区移除该测试关联、保存并再次重新加载，图片区计数恢复为 `0`，没有遗留验收数据。页面及素材始终保持 `draft/unpublished`，未改公开 Nuxt 布局、路由、动画或发布状态。该项只证明 CNC 主图一条受控素材的选择、保存、预览、重载与恢复；其它 CNC 图层、工艺节点及其余页面媒体仍须逐项验收。

- 2026-09-02：服务支持“服务入口”完成一条真实 PC 草稿图标替换闭环，并修复同一展示位置存在默认槽位时的选择优先级。TDD 先新增失败断言：同一 `role` 的早期无路径默认项与后续受治理素材并存时，渲染器必须优先选择具有真实资源路径的受治理项；再新增 `selectSectionMediaEntry()` 并让服务页的型号、服务入口和办事处图片共用该选择规则。真实工作台进入“服务支持 -> 服务入口”，从 8 条 `service.action.icon` 草稿候选中选择 `media_assets/77`（保修状态验核图标），填写展示位置 `action-1` 后保存页面草稿；重新连接实时预览实际请求 `/api/preview/media/77` 并返回 `200`，不是 `service-action-1.png` 静态回退。工作台重新加载后，认证 Directus 读取确认 `pages/3.sections[support-actions].media` 中仅有 `{ role: "action-1", media_asset_id: "77" }`。验收结束后以完整 `sections` 快照精确移除该临时关联，认证回读 `remainingActionOne=0`，再重新加载工作台，未留下测试内容。网站全量测试 `399/399` 通过；素材和页面始终为 `draft/unpublished`，未发布，也未改 Nuxt PSD 布局、路由或动画。本项只覆盖一条服务入口草稿图标，不代表服务首屏、地图、办事处图片或公开媒体发布已完成。

- 2026-09-02：首页首屏视频的私有草稿预览链路完成修复与真实验收。发现事实：页面草稿已存 `pages/1.sections[hero].hero_video_asset_id=49`，工作台亦能选择素材，但原实时预览仍回退 `/assets/home-intro-raw.mp4`；根因有三处：工作台媒体物化将标量 ID 覆写为 URL、CMS 预览清洗遗漏临时 URL、Nuxt 只接受公开 `/assets` URL。TDD 先新增失败测试，随后改为保留持久化 ID 并单独携带 `hero_video_asset_url=/api/preview/media/49`；CMS 令牌会话也将首页专用 ID 纳入授权集合并生成同源代理地址。重建内容预览端点、工作台扩展，重启 Directus 和 Nuxt 后，以管理员令牌真实签发 `pages/1` 预览、通过 Nuxt `/api/preview/open` 建立会话；会话确认 `assetId=49`、`mediaPath=/api/preview/media/49`，实际视频代理返回 `HTTP 200`、`video/mp4`、`12,454,695` 字节。定向回归 `113/113` 通过。草稿视频仍仅在受保护的 CMS 预览中使用，未修改公开首页、Nuxt 版式或发布状态。

- 2026-09-02：先进制造首屏背景完成一条已有草稿素材的可逆真实预览验收，无需改变 Nuxt PSD 布局。核对媒体库后，`media_assets/55` 是唯一精确匹配 `manufacturing.hero.image` 的 `3840x2156` PNG 草稿，页面原本未关联该素材。以完整 `pages/8.sections` 快照临时在 `hero.media` 追加 `{ media_asset_id: "55", role: "hero-building" }`，认证 Directus 回读确认角色与关联保持；签发 `pages/8` 预览令牌、经 Nuxt 建立受保护会话后，预览数据与 `/manufacturing?cmsPreview=1` HTML 均实际使用 `/api/preview/media/55`。代理响应 `HTTP 200`、`image/png`、`12,728,903` 字节，确认不是静态 PSD fallback。最后以原始完整段落快照恢复，并回读确认没有 `55` 遗留绑定；素材和页面全程保持 `draft/unpublished`，未触及公开页面、路由、动画或发布状态。

- 2026-09-02：补齐服务支持首屏背景的媒体治理与画布展示位。此前服务页虽然可从 `pages/3.sections[hero].media` 读取角色为 `background` 的受控素材并将其作为 `--service-hero-background` 渲染，但页面画布未声明展示位、工作台也没有精确规格，导致媒体模式无法针对首屏筛选素材。本轮 TDD 先加入失败断言，再新增统一展示位 `service.hero.image`：仅接受图片、至少 `1920×960`、建议 `2:1`、最大 `25 MB`；工作台画布在服务支持首屏媒体模式精确筛选该展示位，Nuxt 首屏根节点声明同一 `data-cms-preview-placement-key`。已用管理员令牌执行 Directus schema apply（字段更新 3 项），重建工作台并重启 Directus/Nuxt；运行时读取 `media_assets.placement_key` 元数据确认该选项存在，`8055/server/health` 与 `4175/service` 均为 `200`，服务页 HTML 含该展示位标记。全量回归：CMS `415/415`、Website `400/400`。当前素材库尚无符合该展示位的业务首屏图片，因此本项完成“上传/筛选/绑定入口”而非“替换为另一张实际业务背景”的可逆画布验收；未修改公开 Nuxt 默认背景、PSD 坐标、路由、动画或发布状态。

- 2026-09-02：关于瑞钧“发展历程”时间轴背景完成真实受治理媒体闭环。先补齐 Nuxt `about.vue` 时间轴根节点的 `data-cms-preview-placement-key="about.timeline.background"`，并将现有 `timeline-paper-texture.jpg` 按显式网站资产白名单导入为 `media_assets/87` 私有草稿（`draft/unpublished/pending_review`，3840×1800）。TDD 定向 CMS 回归 `85/85`、网站页面映射回归 `12/12` 通过；`verify-about-timeline-media-preview.mjs` 实际把素材临时绑定到 `pages/2.sections[history].media`，经 Directus 回读、Nuxt 受保护预览会话确认 `/api/preview/media/87` 被服务端渲染，随后恢复完整 `sections` 快照并认证回读无残留。随后为已有时间轴导航图标补齐 `about.timeline.icon` 展示位与导入白名单，导入 `media_assets/88`，并以同样的真实闭环验证 `/api/preview/media/88`、画布展示位和完整恢复。新增定向回归通过；未改公开时间轴默认背景/图标、Nuxt PSD 布局、路由、动画或发布状态。

- 2026-09-02：首页“三大理由”媒体展示位完成 TDD 与真实 PC 草稿预览闭环。新增受治理展示位 `home.reason.background`（图片，至少 1600×900，16:9，最大 25MB）和 `home.reason.machine`（设备前景图，至少 160×240，保留原图比例，最大 25MB）；Nuxt 首页三条理由图片节点分别声明对应展示位，`performance` 使用 `foreground` 角色，另外两项使用 `background` 角色。先修正本地媒体导入白名单测试与实际 `website/public/assets/psd/reason-*` 路径不一致的问题，CMS 定向回归 `102/102`、Nuxt 定向回归 `2/2` 通过；应用 Directus schema 后重启加载新的治理 hook，导入 `media_assets/89`（增效降损设备图）、`90`（先进智造背景图）、`91`（行业领军背景图），三项均保持 `draft/unpublished/pending_review`。真实验证脚本 `verify-homepage-reason-media-preview.mjs` 将 `media_assets/90` 临时绑定至 `pages/1.sections[advanced-manufacturing].media`，受保护 Nuxt 预览实际渲染 `/api/preview/media/90` 并含 `home.reason.background` 展示位；`verify-homepage-reason-machine-media-preview.mjs` 对 `media_assets/89` 与 `pages/1.sections[performance].media` 验证 `/api/preview/media/89`、`home.reason.machine` 和 `foreground` 角色。两次均完成 Directus 回读、完整 `sections` 快照恢复，无验收残留。CMS 全量回归 `401/401`、Website 全量回归 `401/401`，CMS `8055` 与 Nuxt `4175` 健康检查均为 `200`。本项证明首页理由背景/设备图的登录后台上传候选、绑定、实时预览、保存、重载基础链路；不代表正式版权审核、公开发布或首页全部文字/图标/位置样式已完成。

- 2026-09-02：产品 PDF 附件下载闭环完成 TDD 与真实运行验收。先新增产品资源下载属性测试，随后在真实草稿预览中发现 `decoratePreviewMedia()` 为附件提供的是受保护 `path`，而产品详情模板直接调用未必存在的 `resource.url.startsWith()`，导致 SSR `500`（`Cannot read properties of undefined`）。最小修复是在 `website/pages/product/[slug].vue` 增加 `productResourceUrl()`，统一兼容公开 `url` 与预览 `path`，并为 PDF 资源链接增加 `download` 属性；未改变产品页布局、路由或公开默认内容。新增 `cms/scripts/verify-product-resource-download-preview.mjs` 与 `visual:verify-product-resource-download` 命令：临时上传 PDF 至 MinIO、创建 `product.document` 草稿资产、绑定 `product_models/1.resources`，认证回读确认保存；签发预览令牌后，Nuxt 受保护 `/api/preview/media/<id>` 实际返回 `200 / application/pdf / 8 bytes`，产品预览 HTML 实际包含受保护附件路径和下载属性，公开产品 API 未泄露草稿标题；最后恢复原 `resources` 并删除临时媒体与文件，无残留。定向网站回归 `33/33` 通过，CMS 全量回归 `427/427`、Website 全量回归 `403/403` 通过；Nuxt 生产构建使用隔离 `NUXT_BUILD_DIR` 成功。该项完成“上传、绑定、预览下载、公开隔离、恢复”闭环，但真实业务 PDF 仍需由业务提供并经版权审核后再发布。

- 2026-09-02：修复视频分享文章草稿实时预览媒体为空的缺口。失败证据是文章详情 iframe 能显示标题、日期但 `<figure>` 为空；原因是工作台 `buildLivePreviewRecord()` 的 `articles` 分支只传递 `{ media_asset_id }`，没有将私有草稿素材物化为预览路径。新增模块回归要求文章媒体引用调用 `previewMediaAsset()`；最小修复将文章媒体按受控引用解析为 `/api/preview/media/:assetId`、`mediaType` 和可选 `posterPath`，同时保留 `media_asset_id` 供预览会话授权。CMS 定向工作台/媒体回归 `75/75`、CMS 全量 `430/430`、Website 全量 `403/403` 通过；扩展重建、Directus 重启后健康检查 `8055/server/health=200`。真实 PC 工作台打开临时视频分享草稿，Nuxt 详情 iframe 检测到 `video=1`、`figure=1`，视频源为 `http://127.0.0.1:4175/api/preview/media/97`，带会话请求返回 `200 video/mp4`；验收截图：`output/playwright/news-video-draft-media-rendered-20260902.png`。临时文章 `articles/35`、媒体资产 `media_assets/97` 及 Directus 文件已通过认证 DELETE `204` 清理，重载工作台后视频新闻列表不再显示测试草稿。未改变 Nuxt 原布局、路由、动画或公开发布状态。

- 2026-09-02：服务支持首屏背景完成真实 PC 工作台可逆验收。工作台“服务支持 -> 服务支持首屏”选择受治理草稿素材 `media_assets/86`（`service.hero.image`），添加后填写展示位置 `background` 并保存；状态明确返回“页面草稿已保存，并已进入内容版本审计”。重新连接实时预览后，Nuxt iframe 的 `.psd-service-hero` 计算背景为 `/api/preview/media/86`，同源受保护请求返回 `200 image/jpeg`；随后点击“重新加载”确认关联仍存在。最后在同一表单移除素材并保存，认证 Directus 回读 `pages/3.sections[hero].media=[]`，iframe 已恢复静态 `/assets/service-library-hero-v4.jpg`。同时 `visual:verify-service-hero-media` 自动脚本通过且恢复原始完整 sections 快照。素材与页面仍为 `draft/unpublished`，未触及公开页面、Nuxt PSD 布局、路由或动画。首次保存后的旧预览会话对新增素材会返回 404，需点“重新连接实时预览”签发授权会话；这是当前受保护预览的明确操作步骤，不应误判为媒体上传失败。

- 2026-09-02：关于瑞钧图库素材进入受治理私有候选库。按现有 PC 槽位的真实源图尺寸修正最低规格：`qualification.image` 至少 `365×410`、`about.gallery.image` 至少 `792×446`、`about.client.image` 至少 `542×406`；所有候选仍为 `pending_review/draft/unpublished`，不改变公开官网。扩展本地媒体清单新增 4 张厂区图（`media_assets/98-101`）、1 张合作品牌图（`102`）、10 张国内/国外客户图（`103-112`）及 20 张认证/荣誉/专利图（`113-132`），均记录来源、用途、页面与区块。新增 `visual:verify-about-factory-media` 完成真实受保护预览闭环：临时把 `media_assets/98` 绑定至 `pages/2.sections[factory].media`，Nuxt `/about` 实际渲染 `/api/preview/media/98`，随后恢复完整 sections 快照并确认无残留。该项证明“上传候选 -> 页面绑定 -> 登录预览 -> 恢复”链路，不代表正式版权审核、公开发布或关于页全部图库已逐张替换验收。
- 2026-09-02：关于瑞钧“合作品牌”完成真实 PC 草稿媒体闭环。先新增失败回归，确认 Nuxt 合作品牌图片缺少 `about.partner.image` 展示位，导致画布无法可靠按用途筛选；最小修复是在合作品牌图库图片上补齐 `data-cms-preview-placement-key="about.partner.image"`，不改变公开布局。真实工作台从“关于瑞钧 -> 合作品牌”选择私有候选 `media_assets/102`，填写展示位置 `partner-1`，保存页面草稿后重新加载，画布中图片实际使用 `/api/preview/media/102`，点击图片属性面板准确显示 `pages/2 · sections[partners].media.0` 与媒体替换控件。随后移除临时关联并放弃未保存变更，认证回读确认无残留；脚本 `visual:verify-about-partner-media` 同步完成 Directus 保存、受保护预览、HTML 展示位断言和完整恢复。该项仍为 `draft/unpublished/pending_review`，不代表正式版权审核、公开发布或客户/证书图库全部逐项验收。
- 2026-09-02：认证证书首条完成独立 `qualifications` 记录的草稿媒体替换闭环。先新增失败测试，明确证书不得误写为 `pages.sections`：验证脚本必须写入 `qualifications/1.assets.0`、签发 `qualifications/1` 预览令牌、渲染受保护媒体后完整恢复。最小实现 `visual:verify-about-qualification-media` 使用候选 `media_assets/113` 临时替换“质量管理体系认证证书”的第一张图片；认证 Directus 回读为 `{ alt, media_asset_id: 113 }`，预览会话和 Nuxt `/about?cmsPreview=1` 实际使用 `/api/preview/media/113`，HTML 含 `qualification.image` 展示位。结束后恢复原静态资产数组并认证回读一致，无残留。该项为私有 `draft/unpublished/pending_review` 素材的登录预览证明，不等同于公开证书替换或正式审核发布。
- 2026-09-02：关于瑞钧国内/国外客户图库完成双向防串写的草稿媒体闭环。先新增失败测试，规定 `clients-domestic` 只能接受 `media_assets/103`（角色 `domestic-1`），`clients-global` 只能接受 `media_assets/108`（角色 `global-1`），每次保存都必须断言另一客户区块的媒体数组保持不变。`visual:verify-about-client-media` 已分别完成保存到 `pages/2.sections[clients-domestic].media.0` 与 `pages/2.sections[clients-global].media.0`、认证 Directus 回读、Nuxt 受保护预览 `/api/preview/media/103` 和 `/api/preview/media/108`、`about.client.image` 展示位验证，以及完整 sections 恢复。真实工作台进入“关于瑞钧 -> 国内客户”时，素材下拉只列出 5 张国内客户候选，不显示海外候选。上述素材均维持 `draft/unpublished/pending_review`，未替换公开官网。

- 2026-09-02：补齐先进制造工艺节点草稿预览的真实数据契约缺口，并完成失败测试到运行验证。原 `cleanSectionValue()` 未保留工艺节点的 `media_role` 与条目级 `field_presentation`，导致 Directus 记录虽已保存，预览会话无法找到新增节点，工作台不能可靠定位其标题/说明。TDD 先新增断言要求 `process.items[]` 保留 `title/body/connection_label/media_role` 及受控标题、正文样式，失败后仅扩展预览白名单并复用 `normalizeFieldPresentations()`；未开放任意字段或 CSS。重建预览扩展、重启 Directus 后，`verify-manufacturing-process-node-preview.mjs` 通过：`pages/8.sections[process].items` 可保存、受保护预览会话返回完整节点、Nuxt `/manufacturing?cmsPreview=1` 渲染临时节点及位置/字号变量，脚本结束后完整移除临时数据并回读确认 `restored=true`。CMS 全量回归 `437/437`、Website 全量回归 `405/405` 通过；CMS `8055/server/health=200`、Nuxt `4175/` 为 `200`。本项只证明工艺节点预览数据契约和一条临时节点闭环，不代表先进制造全部节点、正式媒体或六页全量 Visual Editing 已完成。

- 2026-09-02：修复视频分享文章详情画布选中视频后错误显示“待媒体”的运行时缺口。真实浏览器证据显示：`articles/36` 的详情 iframe 已渲染 `<video data-cms-preview-field-path="media.0.path" data-cms-preview-media-role="video">`，文章表单也已有受控草稿素材 `media_assets/133`，但工作台媒体工具选中后没有候选。根因是该详情节点的 section key 为 `cms-preview-article`，且运行时不应依赖文章分类字段推断展示位；TDD 先增加失败断言，随后将文章 `media.N.path` 且 `elementType=video` 的画布选择固定映射到 `scope=article / placementKey=news.video_share.list / pageKey=news / sectionKey=video-sharing`。重建扩展并重启 Directus 后，真实 PC 工作台“视频新闻 -> 视频分享内容 -> 打开实时预览 -> 媒体”点击视频，属性面板已显示“媒体替换”及 `展会快闪开头 · 展会快闪开头.mp4 · video/mp4` 候选；受保护媒体代理返回 `HTTP 200 video/mp4`。CMS 全量回归 `444/444`、工作台定向回归 `76/76` 通过。当前展示位只有 1 个候选，尚未伪造第二个素材；因此本项证明“已上传视频可在画布中找到并进入替换控件”，不宣称不同视频之间的实际切换或发布审核完成。

- 2026-09-02：修复视频分享列表卡片与文章详情使用不同媒体字段的 P0 绑定缺口。真实浏览器切换到“列表卡片画布”后，卡片虽实际播放 `/api/preview/media/133`，却错误标注为 `articles/36 · video_url`；该旧字段不会更新当前受控媒体数组，导致列表页媒体替换无法稳定保存。TDD 先新增失败测试，要求列表优先定位 `media[]` 中真实 `mediaType/mimeType=video` 的索引，生成 `media.N.path`，仅当历史文章没有受控媒体时才回退 `video_url`。修复后网站定向回归 `11/11` 通过；真实 PC 在“视频新闻 -> 视频分享内容 -> 打开实时预览 -> 列表卡片画布 -> 媒体”点击视频卡片，iframe 标记与属性面板均为 `media.0.path`，并显示受治理草稿候选 `展会快闪开头`。未更换、保存或发布素材。Nuxt 热更新期间旧预览令牌不会自动重新携带草稿叠加，点击工作台“重新连接实时预览”后恢复是当前受保护预览会话的正常操作，不应误判为媒体字段丢失。

- 2026-09-02：修复媒体资产上传表单与后端治理规范漂移。TDD 先加入失败断言，要求上传界面提供 `home.reason.background`、`home.reason.machine`、`service.action.icon` 三个已有官网画布展示位，并锁定证书、厂区图库、客户图库的实际源图最低尺寸；随后补齐展示位选项，校正为 `qualification.image=365x410`、`about.gallery.image=792x446`、`about.client.image=542x406`，并新增显式展示位上下文映射。上传“视频分享列表”后现在自动填充 `page_key=news`、`section_key=video-sharing`，不再错误地将 `news.video_share.list` 拆成 `video_share`；页面、区块和用户手工覆盖字段仍可编辑。工作台定向测试 `79/79`、CMS 全量回归 `447/447` 通过；扩展已重建，Directus 已重启并返回健康。该项修复上传/筛选入口，不代表业务素材已经完成版权审核或公开发布。

- 2026-09-02：补齐关于瑞钧首屏现有背景层的受治理展示位。事实是 `about.vue` 的共享背景、首屏背景图和机器图此前只有 `data-cms-preview-media-role`，媒体上传表单与画布筛选无法判断其用途，因此即便页面支持私有媒体也会回退到静态 PSD。TDD 先加入失败断言，再新增 `about.hero.image` 规格（至少 `1920x900`、建议 `16:9`），并让工作台在“关于瑞钧 -> 关于瑞钧首屏”选中首屏媒体时使用该展示位；Nuxt 三个现有首屏媒体层均声明相同展示位，保留 `backdrop/background/image` 角色区分和原 PSD 几何。CMS 工作台定向 `80/80`、关于页映射定向 `13/13`、CMS 全量 `448/448`、Website 全量 `410/410` 通过；扩展已重建、Directus 已重启，`8055/server/health`、`4175/about`、MinIO readiness 均为 `200`。本项完成上传与筛选入口，不代表业务首屏新素材已审核或发布。

- 2026-09-02：补齐首页产品系列封面的媒体展示位。事实是首页产品卡片已经绑定 `product_series.cover_asset`，但画布节点只有 `mediaRole=cover`，没有 `product.gallery.image`，导致媒体模式无法按产品图库筛选草稿候选。TDD 先加入 CMS 与 Nuxt 失败断言，再让工作台对 `product_series` 的 cover 选择固定使用 `scope=product / placementKey=product.gallery.image`，并在首页封面节点声明同一展示位；未改变产品卡片路由、PSD 尺寸或公开 fallback。CMS 工作台定向 `81/81`、CMS 全量 `449/449`、Website 全量 `411/411` 通过；扩展已重建、Directus 已重启，运行健康检查保持 `8055/4175/9000=200`。本项完成候选筛选入口，不代表尚有已审核业务封面或公开发布。

- 2026-09-02：首页共享时间轴媒体已接入受治理展示位。事实是主页时间轴背景和导航图标没有展示位声明，不能从媒体资产中按用途筛选；TDD 先加入失败断言，再让主页 `history` 背景/图标分别使用共享 `about.timeline.background`、`about.timeline.icon` 展示位，工作台对主页时间轴放宽页面键匹配但仍严格校验区块和展示位，保持与“关于瑞钧”共用里程碑素材而不复制记录。未改变首页时间轴动画、锚点或 PSD 几何。CMS 工作台定向 `82/82`、CMS 全量 `450/450`、Website 全量 `412/412` 通过；扩展已重建、Directus 已重启，`8055/server/health`、`4175/about`、MinIO readiness 均为 `200`。本项完成主页时间轴上传/筛选入口，不代表业务素材审核或公开发布。

- 2026-09-02：补齐服务支持办事处地区图片与地图的媒体展示位。事实是 `service.vue` 已有地区图片/地图字段路径，但没有用途标识，媒体模式无法区分办事处照片和地图候选。TDD 先加入 CMS 与 Website 失败断言，再让工作台对 `office-directory` 按 `mediaRole` 分别使用 `service.office.image` 与 `service.office.map`，Nuxt 仅在存在真实字段绑定时声明对应展示位；静态默认图片继续只读，原地区、门店和地图交互不变。CMS 工作台定向 `83/83`、办事处页面定向 `28/28`、CMS 全量 `451/451`、Website 全量 `413/413` 通过；扩展已重建、Directus 已重启，`8055/4175/9000` 健康检查均为 `200`。本项完成办事处媒体上传/筛选入口，不代表业务图片审核或公开发布。

- 2026-09-03：修复首页三大理由横移图标的画布媒体筛选缺口。事实是图标候选已经导入为 `media_assets/143`（增效降损）、`144`（先进智造）、`145`（领军品牌），但工作台没有按 `mediaRole=icon` 将三个理由区块映射到 `home.reason.icon`，点击图标会落到文字字段或错误的背景展示位。TDD 先新增 `visual-media-placement.test.mjs` 失败断言，要求三个 section 均返回 `scope=homepage / placementKey=home.reason.icon / elementType=image`，再新增受控 `resolveHomepageReasonMediaPlacement()` 映射；同时删除重复的图标展示位配置。通过 CMS 全量 `453/453`、Website 全量 `413/413`。真实 PC 管理员画布验证：三枚图标均从受保护预览地址 `/api/preview/media/143`、`/144`、`/145` 渲染，点击“媒体”工具后属性面板准确命中 `pages/1 · sections[performance|advanced-manufacturing|industry-leadership].media.0`，每个区块只显示自身图标候选，图片自然尺寸分别为 `107×106`、`89×108`、`83×109`。三条页面草稿仍为 `draft/unpublished`，未改变公开官网布局、PSD 几何、路由或动画。
