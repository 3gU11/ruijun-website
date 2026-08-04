# 瑞钧官网 Nuxt 应用

> 适用代码目录：`../../website/`。下文命令均在 `website/` 中执行。

`website/` 是官网的 Nuxt 3 SSR/BFF 应用。浏览器只访问同源公开接口；CMS、售后和通知的凭据只由服务端运行时配置读取。

## 本地命令

```powershell
npm test
npm run dev
npm run build
```

当已有 Nuxt 开发服务器运行时，可设置独立构建目录以避免共享 `.nuxt` 状态：

```powershell
$env:NUXT_BUILD_DIR = '.nuxt-build-verify'
npm run build
```

## 服务端配置

`CMS_BFF_TOKEN` 仅供 Nuxt 服务端访问 Directus，不能提供给浏览器。`CMS_MEDIA_ASSETS_URL` 也只在服务端读取；`CMS_PUBLIC_ASSET_BASE_URL` 是公开资产域名，不是 Token，生产必须使用 HTTPS。`CMS_WEBHOOK_SECRET` 仅用于 CMS 缓存失效 webhook 的鉴权；`media_assets` 事件会同时刷新产品和品牌证据缓存。其余本地变量保存在被忽略的 `.env.local`，生产环境从受控密钥存储注入。
