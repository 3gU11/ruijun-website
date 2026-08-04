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
3. 将 `.env.local` 的变量导入当前终端后执行 `npm run bootstrap`，再执行 `npm start`。
4. 执行 `npm test` 验证内容模型、导入规则和配置契约。

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

当真实 Directus 实例、服务端写入令牌和审核流程准备好后，使用 `npm run seed:drafts`
导入当前产品与页面草稿。该命令只在同时提供 `CMS_BASE_URL` 与服务端
`CMS_WRITE_TOKEN` 时执行，不会自行发布任何内容。

## 产品技术审核清单

本地 Directus 启动并提供受限服务端令牌后，可执行以下只读命令导出产品审核清单：

```powershell
npm run report:product-review
```

清单按产品系列与型号列出来源、草稿状态、系列归属待确认、参数冲突、系列别名、来源缺失和结构化参数缺失。它只读取 `product_series` 与 `product_models`，不改变草稿、审核状态、官网缓存或公开内容。产品负责人和技术审核人确认在售范围、型号命名、参数版本及测试条件后，仍须通过既有审核工作流送审和发布。

Directus 在维护窗口重启并加载扩展后，技术审核人员也可访问 `/admin/ruijun-product-review-workbench` 查看同一套问题规则。该模块只使用当前登录会话读取产品草稿，不提供写入操作；补充资料和提交审核仍应在 Directus 原生内容详情中完成。

## 审核读取服务账号

生产环境的 `report:product-review` 与 `report:service-content-review` 应优先使用 `CMS_CONTENT_AUDIT_TOKEN`。该令牌绑定“Content audit reader”角色，只能读取产品系列、产品型号、服务资料、服务网点和售后入口，不能读取线索、FAQ、维修数据或执行任何写入。

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
