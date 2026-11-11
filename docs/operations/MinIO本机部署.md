# MinIO 本机部署

本机通过官方源码构建 MinIO，使用独立后台进程运行，不依赖 Docker。

- S3 接口：http://127.0.0.1:9000
- 管理控制台：http://127.0.0.1:9001
- 账号和随机密码：项目根目录 `.local/minio/credentials.json`
- 数据目录：项目根目录 `.local/minio/data`
- 日志：`.local/minio/stdout.log` 和 `.local/minio/stderr.log`
- 私有存储桶：`ruijun-cms`、`ruijun-repairs`

在项目根目录启动：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-minio.ps1
```

停止：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-local-minio.ps1
```

初始化存储桶并验证上传、下载、删除：

```powershell
node .\scripts\initialize-local-minio.mjs
```

此部署仅监听本机，未配置开机自启。MinIO 的新版本控制台主要用于对象浏览，部分管理操作通过 S3 或管理 API 执行。

CMS 和售后原有文件仍使用各自本地目录。本次部署提供对象存储服务及存储桶；应用切换存储需要另外配置和验证。售后目前直接读写本地附件，接入对象存储需要修改上传和鉴权下载逻辑，不能只修改环境变量。

CMS 后续可以增加 `s3` 存储位置并保留 `local` 用于读取历史文件，配置 endpoint、bucket、region、force-path-style 以及专用应用凭据。不要将根账号分发给浏览器。

备份需同时包含 `.local/minio/data`、凭据以及应用数据库。本机凭据和运行数据由根目录 `.gitignore` 的 `/.local/` 排除。
