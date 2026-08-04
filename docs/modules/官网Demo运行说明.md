# 瑞钧官网 Demo

> 适用代码目录：`../../demo/`。

当前官网必须通过 `server.mjs` 启动。它除静态页面外还提供售后入口健康检查和匿名点击事件接口；不要再使用纯静态 `http-server` 作为完整演示服务器。

```powershell
cd D:\CURSORpj\gaunwang\demo
npm start
```

默认监听 `0.0.0.0:4173`。可选环境变量：

- `SITE_HOST` / `SITE_PORT`：官网监听地址和端口。
- `REPAIRSYS_HEALTH_URL`：服务端探测地址，默认 `http://127.0.0.1:3101/api/health`。
- `REPAIRSYS_PUBLIC_BASE_URL`：对浏览器返回的维修系统公开地址；本地未配置时按当前官网主机名生成 `:2888` 地址。
- `WEBSITE_BFF_BASE_URL`：Nuxt 官网 BFF 的服务端地址。Demo 的销售咨询只会同源转发到该 BFF；未配置或 BFF 不可用时返回可理解的失败提示，不会写本地 JSONL、直连 Directus 或使用 CMS 凭据。本地联调可设为 `http://127.0.0.1:4303`。

匿名点击记录写入 `data/analytics-events.jsonl`，只包含入口、页面路径、渠道和时间。该文件是运行数据，不提交代码仓库。
