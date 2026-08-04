# 瑞钧一体化网站项目

本仓库包含瑞钧官网、内容管理、FAQ 服务、售后维修系统，以及配套的产品资料、设计源文件和项目文档。

## 项目结构

| 目录 | 说明 |
| --- | --- |
| `website/` | Nuxt 3 正式官网 |
| `cms/` | Directus 内容管理服务 |
| `faq-service/` | FastAPI FAQ BFF 服务 |
| `repairsys/` | Vue + Express 售后维修系统 |
| `demo/` | 官网静态演示与联调服务 |
| `docs/` | PRD、架构、设计、实施和运维文档 |
| `FAQ/` | FAQ 知识库与部署资料 |

## 本地运行

### 官网

```powershell
cd website
npm install
npm run dev
```

### CMS

```powershell
cd cms
Copy-Item .env.local.example .env.local
npm install
npm run bootstrap
npm run start
```

### FAQ 服务

```powershell
cd faq-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[test]"
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

### 售后维修系统

```powershell
cd repairsys
Copy-Item .env.example .env
npm install
npm run dev
```

详细的需求、架构和运行说明见 [`docs/`](docs/README.md)。本地环境变量、依赖目录、构建产物、日志和测试缓存不会提交到仓库。大型设计源文件通过 Git LFS 管理。
