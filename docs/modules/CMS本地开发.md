# 瑞钧官网 CMS 本地开发

> 适用代码目录：`../../cms/`。下文命令均在 `cms/` 中执行。

`cms/` 提供 Directus 内容模型、导入器和本地验证基线。生产部署仍以
`compose.yaml` 中隔离的 MySQL 与对象存储为准；本地 SQLite 仅用于开发验证。

## 前置条件

- Node.js 22 LTS。当前系统 Node 24 无法下载 `sqlite3` 的匹配预编译包，不能作为本地 Directus SQLite 环境；本地验证统一使用 Node 22。
- Windows C++ 桌面开发工作负载已就绪，可在 `isolated-vm` 缺少匹配预编译包时完成本地原生构建。
- 不在本地环境中填写或提交生产密钥、维修系统令牌或厂商参数口令。

## 本地启动

1. 将 `.env.local.example` 复制为 `.env.local`，替换所有 `<REPLACE_ME>`。
2. 使用 Node.js 22 LTS 在此目录执行 `npm install`。
3. 将 `.env.local` 的变量导入当前终端后执行 `npm run bootstrap`；日常启动可执行 `powershell -ExecutionPolicy Bypass -File .\scripts\run-local-directus.ps1`，脚本固定使用 Node 22 并加载 `.env.local`。
4. 执行 `npm test` 验证内容模型、导入规则和配置契约。

当前可操作 Demo（Windows/SQLite）默认管理入口为 `http://127.0.0.1:8055/admin/`；本机已配置局域网监听时，也可从 `http://172.21.8.158:8055/admin/` 访问。登录信息只保存在被忽略的 `cms/.env.local`，不要写入文档或提交到仓库。该 Demo 不代表生产 MySQL、对象存储、备份、Docker/Linux 或 Dify 已完成。

需要展示通知异常处理工作台时，可创建一条带明确标记的本地示例任务：

```powershell
npm run demo:seed
```

脚本只允许连接 `localhost`、回环地址或 RFC1918 私有地址，重复执行会复用 `DEMO-NOTIFICATION-MANUAL-REVIEW`，不会产生多条相同示例。打开 `/admin/ruijun-notification-workbench` 后可查看人工重试、人工已发送和标记解决三个动作；所有动作必须填写处理说明。演示结束后执行 `npm run demo:cleanup` 删除该示例任务。示例任务不关联真实销售线索，不会调用通知 Webhook，也不会成为公开内容。

FAQ 知识审核 Demo 位于 `/admin/ruijun-knowledge-review-workbench`，仅向技术审核人员、发布人员和系统管理员显示审核摘要，不返回来源文档、排障步骤或安全说明原文。当前本地导入 235 条 FAQ 草稿，其中 235 条待补齐、208 条高风险、0 条可送审；补齐资料后仍需进入 Directus 原生内容详情页完成编辑、审核和发布。

发布人员、只读管理人员或系统管理员可从 `/admin/ruijun-operations-overview-workbench` 进入官网运营总览。该页面只读汇总 15 个可发布内容集合的数量、草稿/待审核/已发布状态、待处理数量和 FAQ 风险摘要，并提供内容编辑、发布就绪、FAQ 审核与版本管理入口；不展示销售线索、通知正文、FAQ 排障步骤或其他私有字段。

产品统一发布工作台位于 `/admin/ruijun-product-release-workbench`。它只允许发布人员或系统管理员通过受保护的 `/product-release` 端点查看下一份产品快照和发布阻断项；发布时会把当前已发布的产品系列、型号和独立参数固化为一个带版本号与摘要的不可变快照，上一份快照自动归档。型号必须关联已发布系列，参数必须关联已发布型号；没有已发布型号时工作台会显示 `NO_PUBLISHED_MODELS`，不会生成空快照。官网 BFF 配置 `CMS_PRODUCT_RELEASES_URL` 后只读取这份快照；快照不存在时返回审核中空集合，CMS 短暂不可用时只使用快照缓存，不会回退到三套独立发布行。发布事务完成后 CMS 会调用官网私有缓存失效接口；失败不撤销快照，工作台会显示固定错误码并允许人工重试。

同一工作台还提供最近 50 个产品快照的历史元数据。恢复历史版本必须在页面内填写 5 至 1000 字的原因；`POST /product-release/{id}/restore` 不会重新激活旧记录，而是复制有效历史快照为新的递增版本，并记录来源快照、来源版本、恢复原因、操作者、时间和系列/型号/参数差异摘要。当前活动版本、空快照、格式或关系损坏快照均不能恢复。恢复提交后同样会刷新官网产品缓存；刷新失败只记录状态，不撤销已经生成的新版本。

首次联调产品发布与官网缓存时，先在 CMS 目录执行：

```powershell
npm run cache-webhook:configure-local
```

该命令只允许回环或 RFC1918 HTTP 地址，在 `cms/.env.local` 与 `website/.env.local` 写入同一份随机 `CMS_WEBHOOK_SECRET`，不会向终端输出密钥。随后重新启动 Directus 与官网，使新环境变量生效。官网应先执行生产构建，再使用 `website/scripts/run-local-website.ps1` 在 `4173` 启动本地预览。

两个服务健康后可执行完整、可清理的发布链路验证：

```powershell
npm run product-release:verify-e2e
```

脚本只创建带随机 E2E 标记的临时系列、型号、参数和基线快照；它会验证 CMS 快照发布、官网私有缓存失效以及官网读取同一版本，最后恢复测试前的活动快照并断言临时记录全部清理。该脚本不审核或发布现有草稿，不得指向公网或生产数据库。

恢复历史版本与官网读取恢复内容的完整验证使用：

```powershell
npm run product-release:verify-restore-e2e
```

该脚本临时发布 v1，修改临时型号后发布 v2，再通过受保护恢复端点将 v1 复制为 v3；它验证来源和恢复原因、审计差异、官网缓存刷新、官网读取恢复内容以及零残留清理。它同样不会审核或发布现有草稿，不得指向公网或生产数据库。

内容编辑工作台会根据当前 Directus 角色显示“新建草稿”：`Administrator`、`系统管理员`和`内容编辑`可进入 `/admin/content/{collection}/+`，审核、发布、销售和通知角色只看到已有草稿的原生编辑入口。新建后的默认状态、可编辑字段和送审权限仍由 CMS schema 与发布 Hook 服务端校验。

## 本地运行自检

在 Directus 已启动的情况下，执行以下命令可以只读核对当前环境：

```powershell
npm run runtime:verify
```

该命令固定使用 Node 22，检查 `sqlite3`、`isolated-vm`、本机 Directus 健康检查，以及每个 Directus 扩展是否已生成构建文件。它只允许访问本机回环地址，不读取或输出 `.env.local` 中的密钥，不写入数据库，也不会启动、停止或重启 Directus。所有项通过时才返回成功；扩展代码更新后仍须在维护窗口重启 Directus，运行中的进程才会加载新扩展。

首次启动并取得仅用于服务端的 Directus 写入令牌后，按以下顺序初始化本地 CMS：

```powershell
npm run schema:apply
npm run seed:drafts
$env:REPAIRSYS_PUBLIC_BASE_URL='https://repair.example.com'
npm run seed:service-entries
```

三个导入命令只创建或更新草稿；产品、页面和售后入口不会自动发布。`REPAIRSYS_PUBLIC_BASE_URL` 必须使用经业务确认的正式域名，禁止将临时内网地址导入为可发布配置。

`npm run schema:apply` 会同时做权限迁移：内容编辑的读/建/改字段来自 CMS 合同白名单，更新行仅允许当前状态为 `draft`、`rejected` 或 `unpublished`；审核人与发布人员没有创建公开内容的权限，生命周期更新仅允许 `status`、`review_note` 以及内容发布 Hook 必须写回的服务器审计字段。Hook 会覆盖客户端提供的审计字段，正文、参数、媒体和其他内容字段不能夹带在审核或发布请求中；已发布内容最终仍由 Hook 拒绝编辑。通知管理员只能查看去锁后的任务字段并提交状态与人工说明；只读管理可以查看内容、版本审计、通知摘要和匿名点击归因，但不能读取销售线索。重复或已废弃的瑞钧策略权限会被自动删除，其他策略不会被触碰。权限迁移是幂等的，可在本地 Demo 运行期间重复执行。

如果在 Windows 上安装依赖时 `isolated-vm` 无法下载预编译模块，需要安装 Visual Studio 的“使用 C++ 的桌面开发”工作负载后，用 Node.js 22 与 npm 10 重建：

```powershell
npx --yes --package=node@22 --package=npm@10 npm rebuild isolated-vm --foreground-scripts
```

这只影响本地 Directus 运行，不影响 CMS 契约和导入器的自动测试。

## 销售通知队列

官网 BFF 在保存线索后向私有 `lead_notification_jobs` 集合写入任务。生产环境由计划任务或独立服务以最小权限服务令牌执行：

```powershell
npm run notifications:run-once
```

Local notification setup is intentionally separate from the website BFF. After Directus is running, run `npm run notifications:initialize-local` once. It creates a least-privilege worker account and persists its generated token only in ignored `cms/.env.local`. Restart Directus afterwards so the notification workflow hook is loaded. For local polling, run `powershell -ExecutionPolicy Bypass -File .\scripts\install-local-notification-worker-task.ps1`; it installs a five-minute task with overlapping runs ignored. The Directus user assigned the `Notification manager` role handles `manual_review` jobs in the `lead_notification_jobs` collection with a required note.

使用真实 Directus 角色会话验证通知异常处理闭环：

```powershell
npm run notifications:verify-e2e
```

该命令临时创建通知管理员、内容编辑账号和三条人工任务，验证通知管理员可以重新投递、记录人工已发送和标记解决，不能读取销售线索或 worker 锁字段；内容编辑不能读取通知队列。服务端会覆盖伪造的锁字段并生成处理人、处理时间和活动日志。验证结束后脚本自动删除临时任务与测试账号；它不会调用外部通知渠道，也不会删除 `demo:seed` 创建的示例任务。

该任务仅向 `SALES_NOTIFICATION_WEBHOOK_URL` 投递线索引用和渠道，不传姓名、电话或需求内容。投递失败按 `LEAD_NOTIFICATION_MAX_ATTEMPTS` 重试；耗尽后记录为 `manual_review`，由销售在 Directus 的线索列表中处理。线索持久化成功后，即使通知任务暂时不可写，也不会向官网表单返回失败。

`data/` 中的 SQLite 文件与 `.env.local` 已被忽略，不得作为生产数据或提交内容。

## 内容版本后台

发布人员或系统管理员可访问 `/admin/ruijun-content-version-manager`，按集合查看最近内容版本、变更字段、快照和“历史快照与当前内容”的字段差异。恢复动作必须填写原因，服务器始终将内容恢复为未发布草稿并记录审计，不会直接重新发布。

本地 Directus 启动后，可运行以下命令验证角色流转、版本读取、字段差异与恢复，并自动清理临时数据：

```powershell
npm run versioning:verify-e2e
```

修改 `extensions/content-version-manager/src/` 后，先在该扩展目录构建，再重启 Directus 以加载新模块：

```powershell
Set-Location .\extensions\content-version-manager
npx --yes node@22 ..\..\node_modules\@directus\extensions-sdk\cli.js build
```

## 公共媒体审核

公共图片、视频和 PDF 先作为 Directus 文件候选上传，再创建 `media_assets` 草稿。服务端会以实际文件元数据校验 MIME、扩展名和体积，候选文件本身不等于已发布媒体。技术或品牌审核人员按使用范围审核，发布人员发布后，内容才能以 `media_asset_id` 引用该资产并进入审核。

本地 Directus 启动后，可执行以下真实 E2E 验证；脚本会自动清理临时文件、内容和测试账号。受 Directus 审计外键约束无法删除的测试账号会归档，而不会保留可登录账户：

```powershell
npm run media:verify-e2e
```

允许的候选文件为 JPEG、PNG、WebP、AVIF（25 MiB）、MP4/WebM（500 MiB）和 PDF（50 MiB）。既有使用 `path` 的草稿媒体仅用于迁移参考，必须改为 `media_asset_id` 后才能送审或发布。

## 内容导入

`import/legacy-product-catalog.mjs` 只将旧站产品资料转换成 CMS 草稿载荷。导入后必须由
产品负责人和技术审核人确认系列归属、名称、参数、证书与公开范围；草稿或下线记录不得
通过官网公开 API、sitemap 或页面访问。

产品目录中的结构化参数会同时展平到独立的 `product_parameters` 集合：当前本地目录生成
190 条参数草稿，保留型号编码、参数分组、中文字段名、值、单位、来源和原始英文键。重复
执行 `npm run seed:drafts` 会按“型号编码 + 参数字段”幂等更新可编辑草稿；审核中、已排期、
已发布或已归档的参数会被跳过，不会被旧目录覆盖。参数仍必须由技术审核人员确认后才能
进入审核和发布流程。

当真实 Directus 实例、服务端写入令牌和审核流程准备好后，使用 `npm run seed:drafts`
导入当前产品与页面草稿。该命令只在同时提供 `CMS_BASE_URL` 与服务端
`CMS_WRITE_TOKEN` 时执行，不会自行发布任何内容。

## 产品技术审核清单

本地 Directus 启动并提供受限服务端令牌后，可执行以下只读命令导出产品审核清单：

```powershell
npm run report:product-review
```

清单按产品系列、型号和独立产品参数列出来源、草稿状态、系列归属待确认、参数冲突、系列别名、来源缺失和结构化参数缺失。它只读取 `product_series`、`product_models` 与 `product_parameters`，不改变草稿、审核状态、官网缓存或公开内容。产品负责人和技术审核人确认在售范围、型号命名、参数版本及测试条件后，仍须通过既有审核工作流送审和发布。

Directus 在维护窗口重启并加载扩展后，技术审核人员也可访问 `/admin/ruijun-product-review-workbench` 查看同一套问题规则。该模块只使用当前登录会话读取产品草稿，不提供写入操作；补充资料和提交审核仍应在 Directus 原生内容详情中完成。

## 审核读取服务账号

生产环境的 `report:product-review` 与 `report:service-content-review` 应优先使用 `CMS_CONTENT_AUDIT_TOKEN`。该令牌绑定“Content audit reader”角色，只能读取产品系列、产品型号、产品参数、服务资料、服务网点和售后入口，不能读取线索、FAQ、维修数据或执行任何写入。

在 schema 已应用且密钥由部署环境注入后，使用以下命令创建或轮换账号：

```powershell
npm run audit:provision-reader
```

该命令要求 `CMS_BASE_URL`、`CMS_ADMIN_TOKEN` 和 `CMS_CONTENT_AUDIT_TOKEN`，令牌必须来自环境密钥管理或被忽略的本地环境文件，不能输出到终端、提交到仓库或写入前端配置。仅本地临时验证时，导出器才允许回退到一次性的 `CMS_WRITE_TOKEN`。

本地开发环境可使用以下命令一次性初始化审核服务账号：

```powershell
npm run audit:initialize-local
```

该命令从被忽略的 `cms/.env.local` 读取本地 Directus 地址和管理员登录信息，以一次性管理员会话幂等应用 schema，并创建或轮换审核账号。首次执行时会生成审核令牌，只写回同一个被忽略的 `.env.local`；终端仅报告账号是否创建或更新、是否生成令牌，绝不输出令牌。生产环境不得使用该本地初始化流程，应由密钥管理注入 `CMS_CONTENT_AUDIT_TOKEN` 并执行 `npm run audit:provision-reader`，同时落实令牌轮换和审计策略。

## 服务支持内容审核清单

在本地 Directus 启动并提供受限服务端令牌后，可执行以下只读命令：

```powershell
npm run report:service-content-review
```

清单只读取 `service_resources`、`service_locations` 和 `external_service_entries`，核对受控文件、资料版本、网点服务状态、联系方式是否完整、售后入口健康状态与发布条件。具体联系方式和目标域名不会写入报告；报告不修改草稿、不打开外部售后系统，也不使本机或未确认链接变为公开入口。

Directus 在维护窗口重启并加载扩展后，具有相应读取权限的审核人员还可访问 `/admin/ruijun-service-content-review-workbench`。该模块复用同一套只读审核规则，概览资料、网点和入口的待处理数量，并仅显示入口路径、状态与审核提示，不展示完整电话、联系人或目标域名；模块没有编辑、发布或外部打开操作，补充资料和送审仍应在 Directus 原生内容详情中完成。

发布人员或系统管理员在维护窗口重启后可访问 `/admin/ruijun-publication-readiness-workbench`。模块只调用私有 `/publication-readiness` 端点；服务器会在读取任何产品系列、产品型号、产品参数、客户案例、制造证据、资质证书、企业历程、服务资料、服务网点、售后入口、公开 FAQ、文章、官网页面、全站设置或公共媒体前强制校验“发布人员”角色或管理员会话，并仅返回内容标签、去重后的阻断项，以及由受控集合和记录主键生成的内部原生详情路径。工作台提供内容类型和阻断状态筛选；“打开内容”只进入 Directus 原生详情页，不写入、不发布、不打开外部售后链接。这覆盖内容发布状态机中的全部 15 个可发布集合；私有线索、通知、点击、去重、上传会话和内容版本记录不进入该视图。

页面的基础字段、SEO 和宣传声明待审核标记，全站导航、页脚、品牌、联系方式和页脚业务审核标记，产品系列来源与待确认别名，产品参数来源，案例加工上下文与客户授权，制造说明与检测依据，资质编号、颁发方、有效期和重新发布授权，历程事件与佐证，服务资料版本、网点有效期和营业状态，公开 FAQ 的技术审核字段与高风险安全说明，以及媒体文件元数据、使用范围和版权状态均纳入检查。新闻可以提供正文或视频，但必须同时具备 slug、分类、摘要、封面、SEO 和来源。`visibility` 不是 `public` 的内部 FAQ 不进入公开发布清单。

媒体检查会在服务器端把 `media_assets` 与对应 `directus_files` 核对；制造和资质中的旧 `path` 素材不能代替受控 `media_asset_id`，网点 `contact` 也只在服务器端判断完整性。响应不会返回文件 ID、素材路径、证书编号、颁发方、来源、参数值、案例过程、FAQ 排障步骤、联系方式或正文。它不授予或扩大“Content audit reader”的读取权限，也不提供编辑、送审、发布、Dify 同步或外部打开操作。

## 强制发布门槛

发布工作台用于提前查看问题，真正的最终门槛位于 `content-publication-workflow` Hook。记录从 `scheduled` 转为 `published` 时，服务器重新执行与工作台相同的内容规则；失败时返回 `CONTENT_NOT_READY`，记录保持未发布且不生成失败版本。数据库驱动返回的页面、SEO、媒体、联系方式和知识步骤 JSON 字符串会先解析再判断，避免误放行或误阻断。

审核人员和发布人员的业务请求只应提交 `status` 与 `review_note`。由于 Directus Hook 会在同一次更新中生成 `publication_state`、发布时间、审核/发布操作者和 `publication_log`，策略层同时允许这些服务器生成字段；客户端提供的同名值仍会被 Hook 丢弃并重新生成。批准、发布、下线或归档时夹带正文、参数、媒体引用或其他内容字段会返回 `CONTENT_MUTATION_FORBIDDEN`；内容必须先由内容编辑修改草稿，再重新走审核流程。系统管理员执行显式生命周期转换时也遵守该限制，但仍可在不改变状态时维护普通草稿。

Hook 文件更新后必须在维护窗口重启 Directus 才会加载。重启前可运行 `npm test` 验证纯状态机与 Hook 契约；真实角色会话的发布、拒绝和版本写入行为仍须在本地 Directus 启动后执行 E2E。

官网前端仍通过 Nuxt BFF 的公共内容契约读取已发布内容，不直接依赖发布就绪工作台或 Directus 表结构。页面布局、组件和动效可以独立迭代；只有公共 BFF 字段、内容模块类型或发布规则变化时，才需要同步更新并评审 CMS 契约。发布就绪检查不会自动送审或发布产品系列、媒体或其他内容。
# CMS Demo 入口

本地 Directus 启动后，先运行 `npm run demo:seed` 写入瑞钧项目标识和一条可清理的人工复核示例，再打开：

```text
http://127.0.0.1:8055/admin/ruijun-operations-overview-workbench
```

运营总览用于演示“查看内容状态 -> 进入内容编辑 -> 检查发布就绪 -> 产品统一发布”的主流程。示例命令不会发布现有草稿。扩展重新构建后执行 `npm run demo:restart`，等待健康检查通过后再刷新浏览器。演示结束可执行 `npm run demo:cleanup` 删除人工复核示例；瑞钧项目名称与品牌色作为本地 CMS 基础配置保留。

内容编辑工作台入口为：

```text
http://127.0.0.1:8055/admin/ruijun-content-editor-workbench
```

该界面面向日常运营编辑：页面内容按段落、SEO 标题、描述和关键词填写；产品系列按基础信息、应用场景和核心能力填写；产品型号的基础信息和独立技术参数以表格维护；“企业资料”可维护企业历程、资质证书及制造证据的文本元数据；“服务支持”可维护服务资料、网点和售后入口的草稿配置。页面段落与产品字段不会要求编辑 JSON，也不会在工作台中提供审核或发布操作。企业资料的 `source_key`、服务资料/网点的来源键及售后入口类型均用于导入和路由稳定性，在日常编辑中保持只读；证书/制造媒体与服务资料文件仍通过原生详情关联受控资产。售后入口必须在正式域名、健康状态、人工兜底和发布审核全部完成后才能公开。它只保存当前登录账号有权编辑的 `draft`、`rejected` 和 `unpublished` 记录；审核中、待发布和已发布记录会显示只读提示，须遵循内容版本恢复与审核发布流程。媒体、来源证据、复杂配置和其他非日常字段仍可通过每个表单的“原生详情”入口查看和维护。
