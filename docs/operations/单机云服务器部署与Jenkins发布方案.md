# 单机云服务器部署与 Jenkins 发布方案

版本：v1.0  
日期：2026-08-13  
状态：实施建议

## 1. 范围和结论

本方案覆盖以下服务在一台 Linux 云服务器上的部署：Nuxt 官网、Directus CMS、repairsys、xunjian、Dify，以及 Jenkins CI/CD。

这是预算受限时可执行的单机方案，不是高可用方案。服务器或云盘故障会同时影响全部系统和发布能力。Dify 使用外部模型 API；本方案不包含在服务器本地运行大语言模型或 GPU。

推荐规格：

| 项目 | 配置 |
|---|---|
| CPU | 8 vCPU |
| 内存 | 32 GB RAM |
| 系统盘 | 200 GB SSD/NVMe |
| 数据盘 | 500 GB SSD/NVMe |
| 带宽 | 10 Mbps 独享起步；照片、视频或访问量较多时 20 Mbps |
| 系统 | Ubuntu Server 24.04 LTS |
| 交换分区 | 4-8 GB Swap，仅用于短时缓冲，不替代内存 |

4 核 4 GB 不能作为上述全量服务的正式运行环境。

## 2. 已确认的资源边界

| 服务 | 运行形态 | 建议内存上限 |
|---|---|---:|
| 官网 | Nuxt 3 SSR / Nitro | 1 GB |
| CMS | Directus | 1 GB |
| CMS 数据库 | MySQL 8.4 | 1.5 GB |
| CMS 文件 | MinIO | 512 MB |
| repairsys | Node API + Nginx 静态站 | 512 MB |
| xunjian | Spring Boot API | 1 GB |
| xunjian 数据库 | MySQL 8 | 1 GB |
| xunjian 前端 | Nginx 静态站 | 128 MB |
| Dify | Web/API/Worker/Redis/数据库/向量库等 | 8 GB 起，按官方 Compose 实际组件调整 |
| Jenkins | Controller 和单个串行构建执行器 | 2 GB |
| 操作系统、Docker、Nginx、监控余量 | - | 3-5 GB |

这些上限不是容量承诺。知识库导入、图片上传、数据库备份、Java/Maven 或 Node 构建会产生明显峰值，因此 CI 任务必须串行，且应避开业务高峰。

## 3. 逻辑拓扑

```text
互联网用户 / 经销商 / 扫码手机
             |
       DNS + HTTPS:443
             |
         Nginx 或 Caddy
  +----------+----------+-----------+-----------+
  |          |          |           |           |
官网 Nuxt  repairsys  xunjian     Dify       CMS 管理端
  |          |          |           |           |
  +----------+----------+-----------+-----------+
             Docker 私有网络
       CMS MySQL / xunjian MySQL / Redis / MinIO / Dify 数据组件

GitHub -- HTTPS Webhook --> Jenkins -- GHCR --> Docker Compose 发布
```

二维码固定使用可信 HTTPS 域名，例如 `https://inspection.example.com/scan/<设备编号>`。不要在二维码中写内网 IP、裸端口或自签名证书地址。

## 4. 域名和公网边界

建议使用独立子域名：

| 域名示例 | 服务 | 对外策略 |
|---|---|---|
| `www.example.com` | Nuxt 官网 | 公开 |
| `repair.example.com` | 客户报修入口 | 公开 |
| `inspection.example.com` | 巡检扫码入口 | 公开 |
| `ai.example.com` | 受控的 AI 功能入口 | 公开，但必须鉴权、限流和审计 |
| `cms.example.com` | Directus 后台 | 仅管理员 IP 白名单或 VPN |
| `jenkins.example.com` | Jenkins | 仅管理员 IP 白名单或 VPN |

云安全组和 UFW 只允许：

```text
22/tcp    SSH，仅管理员固定 IP 或堡垒机；仅密钥认证
80/tcp    HTTP，仅用于证书签发和跳转 HTTPS
443/tcp   HTTPS
```

不得开放 MySQL `3306`、Directus 容器端口 `8055`、Spring Boot `8080`、Dify 内部端口、MinIO 管理端口和 Jenkins `8080` 到公网。Nginx 反向代理是唯一对外入口。

## 5. 主机目录和容器网络

数据盘挂载到 `/srv`，不要把数据库、Docker 数据和附件长期留在系统盘。

```text
/srv/docker                 Docker data-root（可选）
/srv/stacks/gateway         Nginx/Caddy 配置和证书引用
/srv/stacks/website         Nuxt 官网 Compose
/srv/stacks/cms             Directus、CMS MySQL、MinIO
/srv/stacks/repairsys       repairsys
/srv/stacks/xunjian         xunjian、其 MySQL
/srv/stacks/dify            Dify 官方 Compose
/srv/stacks/jenkins         Jenkins home 和部署脚本
/srv/backups                本地短期备份，不作为唯一备份
```

每个业务使用独立 Compose 项目、独立 `.env`、独立数据卷和内部 Docker 网络。官网需要访问 CMS、repairsys 和 Dify 时，只经由内部网络名称或 `127.0.0.1` 反代地址访问，禁止使用公网回环。

## 6. Jenkins CI/CD 设计

### 6.1 角色

GitHub 保存源代码和 Pull Request；GHCR 保存私有、带版本号的镜像；同机 Jenkins 负责 CI 和 CD。该同机设计是过渡方案，后续优先将 Jenkins Agent 迁到独立构建机。

Jenkins 不部署 Nuxt 官网和 Dify 的日常业务更新范围；首期纳入：CMS、xunjian、repairsys。

### 6.2 触发和制品规则

| 事件 | Jenkins 动作 |
|---|---|
| Pull Request | 拉代码，测试、构建和 Compose 校验；不发布，不推正式镜像 |
| 合并到 `main` | 测试、构建、推送候选镜像 `sha-<commit>`；可自动发布测试环境 |
| Git tag `vX.Y.Z` | 构建并推送正式镜像 `vX.Y.Z`，等待生产审批 |
| 生产审批 | 备份、拉取指定 tag、升级单个 Compose 项目、健康检查、失败回滚 |

生产环境禁止使用 `latest`。发布记录至少包含提交号、镜像 tag、执行人、开始/结束时间、数据库迁移和回滚结果。

### 6.3 构建并发和限制

Jenkins 只允许一个构建任务同时执行。为 Maven 和 Node 设置明确限制：

```text
MAVEN_OPTS=-Xmx768m
NODE_OPTIONS=--max-old-space-size=1024
```

构建容器、数据库备份、Dify 知识库导入不能同时执行。Jenkins 应以非 root 用户运行；部署通过受限 `deploy` 用户和最小化 sudo 规则执行固定脚本。不要向 Jenkinsfile 写入数据库密码、GitHub Token 或 Dify Key，统一使用 Jenkins Credentials 和服务器 `.env` 文件。

## 7. 发布顺序

每个项目以独立流水线发布，不能“一键重启全部服务”。

1. 校验 Git tag、镜像摘要和审批记录。
2. 对涉及的数据服务做备份：CMS MySQL + MinIO；xunjian MySQL + uploads；repairsys 数据库 + uploads。
3. 拉取指定镜像并运行 `docker compose config` 校验。
4. 仅更新目标项目，等待健康检查通过。
5. 执行项目对应的业务冒烟测试：CMS 登录和公开读取；xunjian 登录、扫码页和工单提交；repairsys 报修提交和附件访问。
6. 失败时恢复上一个镜像 tag；数据库迁移只能使用已验证的前向兼容迁移，不能假设任意 SQL 都可自动回滚。

CMS 若包含 schema 变更，先在测试环境验证，再做生产备份和迁移。xunjian 的 MySQL 与 CMS MySQL 不能共用同一个数据库实例或账号。

## 8. 数据、备份和保留

以下数据必须持久化并纳入备份：

| 数据 | 备份方式 |
|---|---|
| CMS MySQL | 每日逻辑备份 + 发布前备份 |
| MinIO/CMS 媒体 | 每日增量同步至云对象存储 |
| xunjian MySQL 和 uploads | 每日备份 + 发布前备份 |
| repairsys 数据和 uploads | 每日备份 + 发布前备份 |
| Dify PostgreSQL、向量库、上传文件 | 按 Dify 官方组件分别备份 |
| Jenkins home 和 Jenkins Credentials 恢复材料 | 每日备份，访问严格受限 |

本机 `/srv/backups` 只保留短期副本，例如 7-14 天；至少再保存一份加密的异地对象存储备份。验证恢复演练应至少每季度进行一次。

Docker 日志启用轮转，镜像设置保留策略：每个服务保留最近 10 个成功版本和 30 天内版本；清理前确保生产正在使用的 tag 不会被删除。

## 9. 上线前验收清单

- 所有域名已解析并获得可信 CA 的 HTTPS 证书。
- 所有应用内部端口均未暴露到公网。
- 每个 Compose 项目已配置 restart policy、healthcheck、日志轮转和资源限制。
- 系统、Docker、数据盘和备份路径均有磁盘空间监控与告警。
- SSH 禁用密码认证，管理员账户启用最小权限和密钥访问。
- Jenkins 管理入口已限制来源；GitHub Webhook 配置了独立 secret。
- GHCR 镜像为私有，生产服务器仅使用只读拉取凭据。
- 不再提交真实 `.env`、API Key、管理员密码、签名密钥或 Jenkins 凭据到 Git。
- 已完成一次从备份恢复 CMS、xunjian 和 repairsys 的演练。
- 已验证巡检二维码在外部手机网络下能通过 HTTPS 打开和登录。

## 10. 迁移条件

满足任意一项时，应优先把 Jenkins Agent/CI 迁到独立构建机（建议 4 vCPU、8 GB RAM、100 GB SSD）：

- 构建或发布期间用户可感知到官网、巡检或 Dify 变慢。
- 内存持续超过 80%，或频繁使用 Swap。
- 数据盘可用空间低于 25%。
- 每周构建超过 10 次，或开始需要并行流水线。
- 外部用户量、照片/文件量或 Dify 知识库导入量明显增长。

单机服务器仍是单点故障；将 Jenkins 迁出只能隔离构建风险，不能替代业务高可用、异地备份和灾难恢复方案。
