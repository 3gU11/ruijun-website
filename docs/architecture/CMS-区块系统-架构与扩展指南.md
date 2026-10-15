# CMS 区块系统 — 架构与扩展指南

> 这份文档描述**当前状态**，不是演进历史。想知道"为什么这么设计"看
> `CMS-Shopify风格可编辑能力优化方案-2026-10-07.md`；想知道"现在是什么样、
> 怎么加东西"看这里。

---

## 一句话概括

页面内容由**注册表**声明 schema，工作台按 schema 生成编辑界面，四个读取层按 schema
做白名单过滤，一个共享组件按类型渲染。**新增能力只改注册表和渲染分支，四层过滤自动跟随。**

---

## 五个组成部分

| 文件 | 角色 |
| --- | --- |
| `website/shared/page-section-registry.mjs` | **唯一真相来源**。声明区块类型、字段、变体、预设、适用页面 |
| `website/shared/page-section-sources.mjs` | 动态区块可引用的数据源目录 |
| `website/components/CmsCustomSections.vue` | 渲染层。按 `section.type` 分支渲染，含全部样式 |
| `cms/extensions/content-editor-workbench/src/module.vue` | 编辑层。schema 驱动属性面板、大纲、区块库、预设、跨页复制 |
| `website/shared/page-sections.mjs` | 解析层。把存储记录解析成渲染用的对象 |

### 四个读取层（都做白名单过滤）

```
保存    工作台 validatePageSectionInstance()   ← 拒非法值
草稿预览 cms/content-preview/…previewSection()  ← 再过滤一次
公开读取 website/server/services/cms-page-reader.mjs
渲染    CmsCustomSections.vue                  ← 按 type 分支
```

**四层都过滤是刻意的**：绕过工作台直接写库的内容，也到不了页面。

---

## 字段类型

| 类型 | 语义 | 关键约束 |
| --- | --- | --- |
| `text` | 单行文本 | `maxLength` |
| `textarea` | 多行文本 | `maxLength` |
| `media` | 受控素材引用 | `maxItems`、`roles` |
| `list` | 重复项 | `maxItems`、`itemFields` |
| `select` | 闭集枚举 | 值必须在 `options` 内；`optionLabels` 提供显示名 |
| `number` | 有界整数 | `min`、`max`，必须是整数 |

`select` 的闭集语义是安全边界——它保证区块**不可能**指向未注册的数据源或版式。

---

## 区块类型

| 类型 | 内容来源 | 变体 | 预设 |
| --- | --- | --- | --- |
| `rich-text` | 自身字段 | — | — |
| `image` | 自身字段 + 素材 | — | — |
| `card-grid` | 自身字段 | 网格 / 列表 | 标准三卡 / 双列对照 / 纵向列表 |
| `faq` | 自身字段 | — | — |
| `timeline` | 自身字段 | — | — |
| `stats` | 自身字段 | — | — |
| `data-list` | **外部数据源** | 网格 / 列表 / 紧凑 | 最新动态 / 产品展示 / 资质证书条 |

`data-list` 是唯一内容不在区块自身的类型：它只存**指向**，渲染时读源。

---

## 适用页面

`service` / `about` / `home` / `news` / `product` / `manufacturing` / `contact`

由注册表的 `editablePageSlugs` 常量统一控制。**未列入的页面 fail-closed**——即使数据库里
被塞进区块也不渲染。

页面接入只需三步：

1. 页面已解构 `visualEditMode`（来自 `useCmsDraftPreview()`）
2. 挂 `<CmsCustomSections :page="…" page-slug="…" :visual-edit-mode="cmsVisualEditMode" />`
3. slug 加进 `editablePageSlugs`

---

## 怎么扩展

### 加一个区块类型

```js
// 1. page-section-registry.mjs
'my-block': withVariantField({          // 需要版式时才用 withVariantField
  type: 'my-block',
  version: 1,
  label: '我的区块',
  description: '一句话说明，显示在区块库里。',
  category: '内容编排',
  pageSlugs: editablePageSlugs,
  variants: [{ key: 'grid', label: '网格' }, { key: 'list', label: '列表' }],
  presets: [{ key: 'std', label: '标准', description: '…', values: { … } }],
  fields: [
    { key: 'title', label: '标题', type: 'text', maxLength: 240 },
    { key: 'items', label: '条目', type: 'list', maxItems: 20, itemFields: [ … ] }
  ]
})
```

```vue
<!-- 2. CmsCustomSections.vue：加渲染分支 -->
<section v-else-if="section.type === 'my-block' && (visualEditMode || section.items?.length)"
  class="cms-custom-my-block" v-bind="sectionPresentationAttributes(section)">
  …每个字段都带 data-cms-preview-field-path，否则可视化编辑定位不到…
</section>
```

```css
/* 3. 同一个文件：加样式，类名统一 cms-custom-* */
```

**四层过滤不用改。** 这是这套架构的核心红利。

### 加一个字段类型

1. `validateFieldValue()` 加分支（校验规则）
2. `emptyFieldValue()` 加分支（默认值）
3. `page-sections.mjs` 的 `resolvePageSection()` 加拷贝分支
4. `cms-page-reader.mjs` 的 `publicSection()` 加透传分支
5. `content-preview-content.mjs` 的 `previewSection()` 加透传分支
6. 工作台加控件

字段类型比区块类型改动面大——因为它要贯穿全部四层。

### 加一个数据源

`page-section-sources.mjs` 的 `dataListSources` 加一条：

```js
my_source: { key: 'my_source', label: '我的数据', endpoint: '/api/public/v1/xxx', hrefPrefix: '/xxx/', slugField: 'slug' }
```

注册表的 `dataListSourceKeys` / `dataListSourceLabels` 自动跟随。**映射逻辑不用改**——
`resolveDataListItems()` 探测候选字段名，不绑定某一种 schema。

---

## 必须守住的不变量

1. **区块类型必须有渲染分支**。没有分支时保存照常成功、页面静默空白——最坏的失败模式。
   验收套件会检查。
2. **非默认变体必须有样式规则**。否则选了版式但页面没变化。验收套件会检查。
3. **预设必须能通过校验**。否则套用后无法保存。验收套件会检查。
4. **`data-list` 的 `limit` 在过滤后生效**。先截断再过滤会导致"显示 3 条"只出 1 条。
5. **`select` 值必须在闭集内**，四层都要校验。
6. **字段允许清单必须从注册表派生**。任何保留自有白名单的消费方（实时预览净化器、
   草稿预览净化器）都要 `union` 上 `registeredPageSectionFieldKeys`，而不是手工抄字段名。
   手工维护的清单会**静默丢弃**新增字段——这正是自定义区块一度从实时画布消失的原因。
7. **改注册表后必须重建两个扩展**（见下）。

---

## 构建与验收

### 改完必须重建扩展

`page-section-registry.mjs` 被**两个** Directus 扩展打包：

```bash
cd cms/extensions/content-preview-token-endpoint && npm run build
cd cms/extensions/content-editor-workbench && npm run build
```

漏了 `content-preview-token-endpoint`，预览通道会静默用旧定义过滤区块。

**工作台的 `module.vue` 是纯 JS 的 `<script setup>`（无 `lang="ts"`）**，TS 语法会直接编译失败。
源码 grep 型测试抓不到语法错误，**只有构建能抓到**——所以构建是必跑项。

### 验收套件（只读，随时可跑）

```bash
node cms/scripts/acceptance/run.mjs
```

四组检查：运行时监听 / 注册表完整性 / 页面路由 / 工作台 UI。**不写任何数据**，
工作台检查只开面板不保存。

### 单元与契约测试

```bash
npm --prefix cms test       # 工作台、预览净化
npm --prefix website test   # 注册表、解析、读取、组件
```

### 真机 E2E（会写数据，自行清理）

`cms/scripts/verify-*.mjs` 下有 76 个脚本，覆盖具体功能。多数会写入测试数据后清理，
运行前确认服务在跑。

`cms/scripts/acceptance/` 下有三个自包含脚本，**写入后都会自动还原**：

| 脚本 | 验证内容 |
| --- | --- |
| `run.mjs` | 只读验收套件（`npm --prefix cms run acceptance`） |
| `walkthrough.mjs` | 运营视角走查：新增区块 → 画布实时更新 → 点画布定位 |
| `verify-all-block-types-render.mjs` | **每种区块类型真实渲染**：从注册表构造实例 → 渲染 → 断言容器与字段内容 |
| `verify-real-content-e2e.mjs` | **真实内容端到端**：多角色发布流程 + `data-list` 渲染真实数据 |
| `sweep-public-pages.mjs` | **公开站点质量扫描**：控制台报错、失败请求、坏图、空状态、横向溢出 |
| `diagnose-canvas.mjs` | 画布渲染对照实验（排查用） |

**两层渲染验证的分工**：`run.mjs` 只 grep 组件里有没有渲染分支——快、只读、随时可跑，
但**只证明分支存在，不证明能产出 DOM**。`verify-all-block-types-render.mjs` 才是真正的
渲染验证，它从注册表构造实例，所以**新注册的区块类型会自动被覆盖**。

`data-list` 不在渲染脚本里：它只在数据源有已发布记录时才渲染，由
`verify-real-content-e2e.mjs` 覆盖。

---

## 已知限制

- **实时画布曾不渲染自定义区块 —— 已修复**。根因是消息净化器 `cleanSections`
  （`website/utils/cms-live-preview.mjs`）持有一份**硬编码字段白名单**，其中没有
  `type` / `version` / `enabled`，也没有注册表新增的 `source` / `limit` / `columns` / `variant`。

  工作台每次 postMessage 推送草稿时这些字段被剥掉；而画布用
  `{ ...session.preview, ...liveRecord }` 合并，推送的快照**覆盖**了会话数据——于是
  所有自定义区块被判为"未注册类型"而消失。旧区块本就没有 `type`，所以这个问题从未暴露。

  三条对照路径（同 URL、同会话、同数据）界定了问题范围：

  | 路径 | 修复前 | 修复后 |
  | --- | --- | --- |
  | 工作台实时画布 iframe | 19 / **0** ❌ | 20 / **1** ✅ |
  | 同一 URL 直连浏览器 | 20 / 1 ✅ | 20 / 1 ✅ |
  | HTTP 预览响应（SSR） | ✅ | ✅ |

  **回归防护**：`website/test/cms-live-preview.test.mjs` 有一条守卫测试，遍历注册表
  声明的**所有字段 key**，断言它们都能通过净化器。以后新增字段若不登记到白名单，
  测试会直接失败，而不是在实时预览里静默消失。

  复现脚本：`node cms/scripts/acceptance/diagnose-canvas.mjs`（写入后自动还原）。

- **`scheduled` 是单向状态**：内容审核通过后进入 `scheduled`，而工作流只允许
  `scheduled → published`——没有回到 `draft` 的路径。若一条已通过审核的内容暂时不想发布，
  只能先发布再下架，再回到草稿。这是治理设计上的取舍，不是缺陷，但运营需要知道。
- **发布门禁会拦内容**（设计如此）：引用未发布素材、或缺少摘要/正文/封面/SEO/来源的内容
  无法发布。`cms/scripts/acceptance/verify-real-content-e2e.mjs` 会顺带报告被拦的文章数。
- **`contact` 页之外仍有未接入页面**（如 `repair`），保持 fail-closed。
- **全站共享模块未做**：全站级共享内容（页头/页脚/FAQ 助手）已由组件实现，再做 CMS
  层会重复。跨页复用由「复制到其他页 → 粘贴区块」覆盖。
- **旧 legacy 区块不经过注册表**：走"无 type → 原路径"，因此没有统一校验。
