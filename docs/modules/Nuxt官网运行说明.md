# 瑞钧 Nuxt 官网骨架

> 适用代码目录：`../../website/`。下文命令均在 `website/` 中执行。

`website/` 是 PRD 指定的 Nuxt 3 官网与内容 BFF 迁移目标。当前 `demo/` 仍是 GSAP 视觉和交互的回归基线；在所有页面迁移完成并通过截图回归前，不替换其预览地址。

```powershell
npm install
npm run dev:local
```

`dev:local` 会显式加载被版本控制忽略的 `.env.local` 并监听 `0.0.0.0:4173`。需要稳定后台运行或验证 CMS Webhook 时使用生产预览：

```powershell
npm run build
npm run start:local
```

`start:local` 通过 `scripts/run-local-website.ps1` 加载 `.env.local`，固定监听 `4173` 并运行 `.output/server/index.mjs`。直接执行普通 `npm run dev` 不会保证加载 `.env.local`，可能导致私有缓存失效路由因缺少密钥按设计返回 `404`。

`CMS_PAGES_URL`、`CMS_PRODUCT_SERIES_URL`、`CMS_PRODUCT_MODELS_URL`、`CMS_PRODUCT_PARAMETERS_URL`、`CMS_PRODUCT_RELEASES_URL` 与 `CMS_MEDIA_ASSETS_URL` 仅由 Nuxt 服务端读取。配置 `CMS_PRODUCT_RELEASES_URL` 后，产品列表、详情和对比只读取活动产品快照，不再拼接独立集合；CMS 不可用时只允许返回该读取器已有的最近快照缓存。公开接口为 `GET /api/public/v1/pages/{slug}`、`GET /api/public/v1/product-series` 与 `GET /api/public/v1/product-models?series={seriesCode}`。

`CMS_PUBLIC_ASSET_BASE_URL` 用于生成审核媒体的公开文件 URL。生产必须是受控的 HTTPS CMS/对象存储域名；本地 `127.0.0.1` 或 `localhost` 可省略，Nuxt 会从 `CMS_MEDIA_ASSETS_URL` 推导。浏览器只会收到 `path` 与 `alt`，不会收到 Directus Token 或媒体审核元数据。
# Nuxt website migration

The Nuxt shell exposes public content routes and keeps CMS credentials on the server.

Private runtime variables used by the next migration slice:

- `CMS_SERVICE_ENTRIES_URL`
- `CMS_LEADS_URL`
- `CMS_LEAD_DEDUPE_KEYS_URL`
- `CMS_LEAD_NOTIFICATION_JOBS_URL`
- `CMS_BFF_TOKEN`
- `LEAD_DEDUPE_SECRET`
- `CMS_WEBHOOK_SECRET`
- `CMS_PRODUCT_RELEASES_URL`
- `REPAIRSYS_HEALTH_URL`
- `REPAIRSYS_PUBLIC_BASE_URL`

`CMS_BFF_TOKEN` and `CMS_WEBHOOK_SECRET` are private server credentials and must never use a `NUXT_PUBLIC_` prefix. The BFF token can read only published content and create private lead records; the Webhook secret only authorizes `POST /api/internal/v1/cms/cache-invalidate` from a CMS Flow. Browser code never receives either value. When lead variables are absent, `POST /api/public/v1/leads` returns `503` and never persists customer data in a local demo file.
