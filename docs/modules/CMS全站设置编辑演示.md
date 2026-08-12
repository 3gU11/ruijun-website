# CMS 全站设置编辑演示

## 演示入口

- 内容编辑工作台：`/admin/ruijun-content-editor-workbench`
- 工作台标签：`全站设置`
- 本地演示地址：`http://172.21.8.158:8055/admin/ruijun-content-editor-workbench`

## 可维护内容

当前结构化表单对应 `site_settings` 的 `global` 草稿，可维护：

- 主导航的显示名称与链接。
- 页脚主链接的显示名称与链接。
- 品牌显示名称与 Logo 素材引用。
- 服务电话与 Header CTA 文案、链接。
- 可用语言列表。

链接只允许站内路径或 HTTPS 地址。保存只写入当前 Directus 会话有权编辑的 `draft`、`rejected` 或 `unpublished` 非公开记录，并继续触发现有内容版本审计。

## 受控边界

- `setting_key` 在编辑台只读，避免破坏全局配置的稳定标识。
- 页脚 `requires_business_review` 仅展示，内容编辑不能移除或改写该业务审核门槛。
- 未在表单开放的 `analytics`、来源记录和审核记录保留在 Directus 原生详情页。
- 编辑台不提供送审、排期、发布或下线操作；这些状态迁移仍由服务端工作流和对应角色控制。
- Logo 素材的上传、版权确认和发布资格仍需遵循受控 `media_assets` 流程。

## 验证

本次实现通过内容编辑模块契约测试、Directus 扩展构建、CMS 全量测试与本地浏览器加载检查。演示数据保持草稿状态，未发布任何官网内容。
