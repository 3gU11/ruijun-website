# 瑞钧 FAQ FastAPI BFF

> 适用代码目录：`../../faq-service/`。

官网与 `repairsys` 共用的 FAQ 协议服务。当前基线实现：

- Redis 会话、匿名服务端签名标识和每日成功配额
- 单会话生成互斥、渠道入场控制和 `Idempotency-Key`
- Dify SSE 到 `ack/delta/citation/done/error` 的协议归一化
- `<think>` 与 Dify 私有事件过滤
- `continue_conversation` / `repair_draft` 五分钟一次性交接
- 独立存活/就绪检查、CORS 白名单与无缓存安全响应头

旧 FAQ 归档中的密钥不得复用。先在 Dify 中轮换密钥，再把新密钥放入本机 `.env` 或部署平台的密钥管理中。

## 本地运行

需要 Python 3.12+ 和 Redis 6.2+：

```powershell
cd D:\CURSORpj\gaunwang\faq-service
py -3.13 -m pip install -e ".[test]"
$env:FAQ_REDIS_URL='redis://127.0.0.1:6379/3'
$env:FAQ_DIFY_BASE_URL='https://your-dify.example.com/v1'
$env:FAQ_DIFY_API_KEY='rotated-secret-from-environment'
$env:FAQ_INTERNAL_API_KEY='development-service-key'
$env:FAQ_SIGNING_SECRET='development-signing-secret'
py -3.13 -m uvicorn app.main:app --host 127.0.0.1 --port 3201
```

生产环境必须配置 32 字符以上的内部服务密钥、签名密钥、Dify 地址和新凭据，并启用安全 Cookie。`/api/internal` 只允许 `repairsys` 服务端通过内网访问。

## 测试

```powershell
py -3.13 -m pytest
```
