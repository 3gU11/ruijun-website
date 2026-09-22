import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('content editor workbench provides structured page and product edits through the current Directus session', async () => {
  const [manifestText, index, module, nativeBridge] = await Promise.all([
    readFile(new URL('extensions/content-editor-workbench/package.json', root), 'utf8'),
    readFile(new URL('extensions/content-editor-workbench/src/index.js', root), 'utf8'),
    readFile(new URL('extensions/content-editor-workbench/src/module.vue', root), 'utf8'),
    readFile(new URL('extensions/content-editor-workbench/src/native-live-preview-bridge.js', root), 'utf8')
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest['directus:extension'].type, 'module');
  assert.equal(manifest['directus:extension'].source, 'src/index.js');
  assert.match(index, /ruijun-content-editor-workbench/);
  assert.match(index, /installWorkbenchNavigationEntry/);
  assert.match(index, /data-ruijun-workbench-navigation-entry/);
  assert.match(index, /内容编辑工作台/);
  assert.match(index, /top: '428px'/);
  assert.match(index, /<svg viewBox="0 0 24 24"/);
  assert.match(index, /installNativeLivePreviewBridge/);
  assert.match(nativeBridge, /nativeContentTarget/);
  assert.match(nativeBridge, /\.field\[data-collection\]\[data-field\]/);
  assert.match(nativeBridge, /\.CodeMirror/);
  assert.match(nativeBridge, /windowObject\.setTimeout\(send, 300\)/);
  assert.match(nativeBridge, /event\.source/);
  assert.doesNotMatch(nativeBridge, /localStorage|sessionStorage/);
  assert.match(nativeBridge, /articles: \['id', 'slug', 'category', 'title', 'summary', 'body', 'transcript', 'display_date', 'sort_order'/);
  assert.match(module, /页面段落/);
  assert.match(module, /const visiblePageSections = computed\(/);
  assert.match(module, /v-for="\(section, index\) in visiblePageSections"/);
  assert.match(module, /const pageSectionGroupKeys = Object\.freeze\(\{[\s\S]*'home:why-ruijun': \['why-ruijun', 'performance', 'advanced-manufacturing', 'industry-leadership'\]/);
  assert.match(module, /'product:categories': \['categories', 'proof-efficiency', 'proof-years', 'proof-champion'\]/);
  assert.match(module, /const groupKeys = pageSectionGroupKeys\[`\$\{pageDraft\.value\?\.slug \|\| ''\}:\$\{sectionKey\}\`\];[\s\S]*return groupKeys \? sections\.filter\(\(section\) => groupKeys\.includes\(String\(section\?\.id \|\| ''\)\)\) : \[activePageSection\.value\];/);
  assert.match(module, /当前编辑区块/);
  assert.match(module, /pageSectionName\(section, index\)/);
  assert.match(module, /产品指标：增效降损/);
  assert.match(module, /产品指标：制造经验/);
  assert.match(module, /产品指标：行业表现/);
  assert.match(module, /id: 'proof-efficiency', title: '增效降损', body: '效能提升50%，丝损降低30%'/);
  assert.match(module, /id: 'proof-years', title: '30 YEARS', body: '30年技术沉淀，先进智造工厂'/);
  assert.match(module, /id: 'proof-champion', title: 'Champion', body: '销量持续领先，品质始终如一'/);
  assert.match(module, /理由短标题/);
  assert.match(module, /首屏理由标题/);
  assert.match(module, /首屏理由说明/);
  assert.match(module, /展示数值/);
  assert.match(module, /sectionBodyIsRendered\(section\)/);
  assert.match(module, /此区块当前官网没有正文展示位/);
  assert.match(module, /sectionTitleIsRendered\(section\)/);
  assert.match(module, /此区块当前官网没有标题展示位/);
  assert.match(module, /pageDraft\.value\?\.slug === 'product' && String\(section\?\.id \|\| ''\) === 'model-list'/);
  assert.match(module, /数值单位/);
  assert.match(module, /展示模式/);
  assert.match(module, /shortTitle: '增效降损'/);
  assert.match(module, /产品系列/);
  assert.match(module, /saveVisualParameterGroup/);
  assert.match(module, /分组名称会同步更新当前型号中的/);
  assert.match(module, /Promise\.all\(records\.map\(\(record\) => api\.patch\(`\/items\/product_parameters\/\$\{encodeURIComponent\(record\.id\)\}`/);
  assert.match(module, /normalizeFieldPresentations/);
  assert.match(module, /受控系列封面/);
  assert.match(module, /企业资料/);
  assert.match(module, /发展历程/);
  assert.match(module, /资质证书/);
  assert.match(module, /制造证据/);
  assert.match(module, /服务支持/);
  assert.match(module, /文章与案例/);
  assert.match(module, /articles\?fields=id,slug,category,title,display_date,sort_order,summary,body,body_media,transcript,field_presentation,media/);
  assert.match(module, /field_presentation: normalizeFieldPresentations\(editorialDraft\.value\.field_presentation, \['category', 'title', 'display_date', 'summary', 'body', 'transcript'\]\)/);
  assert.match(module, /媒体资产/);
  assert.match(module, /登记待审核媒体/);
  assert.match(module, /上传并登记候选素材/);
  assert.match(module, /\{\{ asset\.title \|\| asset\.original_file_name \}\}/);
  assert.match(module, /\/users\/me\?fields=id,role\.name/);
  assert.match(module, /\['Administrator', '系统管理员'\]\.includes/);
  assert.match(module, /常见问题知识/);
  assert.match(module, /常见问题知识草稿编辑/);
  assert.match(module, /受控知识媒体/);
  assert.match(module, /保存常见问题知识草稿/);
  assert.match(module, /审核队列/);
  assert.match(module, /待审核内容/);
  assert.match(module, /批准进入待发布/);
  assert.match(module, /退回修改/);
  assert.match(module, /提交审核/);
  assert.match(module, /可提交草稿/);
  assert.match(module, /恢复草稿/);
  assert.match(module, /恢复为草稿/);
  assert.match(module, /新闻与文章/);
  assert.match(module, /内容类型/);
  assert.match(module, /发布日期/);
  assert.match(module, /字幕或文字稿/);
  assert.match(module, /文章受控媒体/);
  assert.match(module, /addEditorialMediaReference/);
  assert.match(module, /removeEditorialMediaReference/);
  assert.match(module, /客户案例/);
  assert.match(module, /新建草稿/);
  assert.match(module, /全站设置/);
  assert.match(module, /受控品牌标志素材/);
  assert.match(module, /全站导航与联系方式/);
  assert.match(module, /footer\.columns/);
  assert.match(module, /addFooterColumn/);
  assert.match(module, /页尾文字样式（默认关闭）/);
  assert.match(module, /footerTextStyleDefinitions/);
  assert.match(module, /normalizeFooterTextStyles/);
  assert.match(module, /当前业务审核标记/);
  assert.match(module, /服务资料/);
  assert.match(module, /新建服务资料草稿/);
  assert.match(module, /视频教学/);
  assert.match(module, /产品技术手册/);
  assert.match(module, /新建官网知识草稿/);
  assert.match(module, /常见故障分析/);
  assert.match(module, /知识分享/);
  assert.match(module, /服务网点/);
  assert.match(module, /售后入口/);
  assert.match(module, /独立技术参数/);
  assert.match(module, /参数与尺寸图标题/);
  assert.match(module, /新增特点/);
  assert.match(module, /新增尺寸图/);
  assert.match(module, /function productDrawingMediaAssets\(\)[\s\S]*filterPreviewStagingMediaAssets\(mediaCandidates\.value, \{ scope: 'product', placementKey: 'product\.gallery\.image', elementType: 'image' \}\)/);
  assert.match(module, /function productFeatureMediaAssets\(\)[\s\S]*filterPreviewStagingMediaAssets\(mediaCandidates\.value, \{ scope: 'product', placementKey: 'product\.gallery\.image', elementType: 'image' \}\)/);
  assert.match(module, /<label>图片<select v-model="feature\.media_asset_id"[\s\S]*<option v-for="asset in productFeatureMediaAssets\(\)"/);
  assert.match(module, /选择产品图片（已发布或仅内部预览草稿）/);
  assert.match(module, /<label class="full">技术参数侧边图<select v-model="modelDraft\.configuration\.labels\.technical_image_asset_id"[^\n]*<option v-for="asset in productDrawingMediaAssets\(\)"[^\n]*>\{\{ modelDrawingMediaAssetLabel\(asset\) \}\}<\/option><\/select><\/label>/);
  assert.match(module, /产品资料链接/);
  assert.match(module, /制造工艺节点/);
  assert.match(module, /新增工艺节点/);
  assert.match(module, /createManufacturingProcessNode/);
  assert.match(module, /连接说明/);
  assert.match(module, /工艺画布位置/);
  assert.doesNotMatch(module, /展示配置（JSON）/);
  assert.match(module, /官网展示位置/);
  assert.match(module, /selectedMediaPlacementHelp/);
  assert.match(module, /media_type: mediaDraft\.value\.media_type/);
  assert.match(module, /placement_key: mediaDraft\.value\.placement_key/);
  assert.match(module, /filterVisualMediaAssets/);
  assert.match(module, /import \{ computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch \} from 'vue';/);
  assert.match(module, /const options = selectedVisualFieldOptions\.value;\s+const normalizedValue = options\.length \? options\.find\(\(option\) => option\.value === value\)\?\.value : value;\s+if \(normalizedValue == null \|\| !setVisualFieldValue\(target, path, normalizedValue\)\) \{\s+error\.value = '请输入有效数值或符合字段格式的内容。';\s+return;\s+\}\s+if \(error\.value === '请输入有效数值或符合字段格式的内容。'\) error\.value = '';\s+recordVisualHistory\(\);/);
  assert.match(module, /visualFieldMaxLength/);
  assert.match(module, /:maxlength="selectedVisualFieldMaxLength"/);
  assert.match(module, /function visualSelectionSource\(element\) \{[\s\S]*const itemId = String\(element\?\.itemId \|\| ''\)\.trim\(\);[\s\S]*const source = itemId \? `\$\{collection\}\/\$\{itemId\}` : collection;[\s\S]*collection === 'pages' && sectionKey && fieldPath[\s\S]*sections\[\$\{sectionKey\}\]\.\$\{fieldPath\}/);
  assert.match(module, /class="visual-property-source">\{\{ visualSelectionSource\(selectedVisualElement\) \}\}<\/p>/);
  assert.match(module, /shouldKeepVisualDraft/);
  assert.match(module, /setVisualPosition\(target, path, visualPosition\);\s+recordVisualHistory\(\);/);
  assert.match(module, /const mediaSlot = selectedVisualElement\.value\?\.mediaSlot \|\| '';[\s\S]*if \(!applyVisualMediaReplacement\(target, path, assetId, \{ mediaSlot, allowEmpty: canRestoreDefault \}\)\) return;\s+recordVisualHistory\(\);/);
  assert.match(module, /\['left', 'center', 'right'\]\.includes\(normalizedMode\)/);
  assert.match(module, /setVisualAlignment\(target, path, normalizedMode\)/);
  assert.match(module, /positionFieldPath/);
  assert.match(module, /sectionKey: selectedVisualElement\.value\.sectionKey/);
  assert.match(module, /command: 'align',[\s\S]*fieldPath: selectedVisualElement\.value\.fieldPath/);
  assert.match(module, /copyright_status/);
  assert.match(module, /poster_asset_id: mediaDraft\.value\.poster_asset_id/);
  assert.match(module, /transcriptRequired/);
  assert.match(module, /eligibleEditorialMediaAssets/);
  assert.match(module, /视频分享可选择已发布视频，或仅用于登录后台实时预览的草稿视频/);
  assert.match(module, /视频分享素材不符合“文章与资讯 \/ 视频分享列表 \/ news \/ video-sharing”的使用范围/);
  assert.match(module, /没有单独海报时，使用视频首帧/);
  assert.match(module, /posterRequired: false/);
  assert.match(module, /normalizeSections/);
  assert.match(module, /normalizeSettings/);
  assert.match(module, /normalizeArticle/);
  assert.match(module, /createEditorialRecord/);
  assert.match(module, /saveEditorialRecord/);
  assert.match(module, /reviewedMediaAssets/);
  assert.match(module, /isReviewedMediaAsset/);
  assert.match(module, /normalizeMediaReferences/);
  assert.match(module, /addCompanyMediaReference/);
  assert.match(module, /removeCompanyMediaReference/);
  assert.match(module, /addModelMediaReference/);
  assert.match(module, /removeModelMediaReference/);
  assert.match(module, /受控型号媒体/);
  assert.match(module, /assets: companyDraft\.value\.mediaReferences/);
  assert.match(module, /media: companyDraft\.value\.mediaReferences/);
  assert.match(module, /media: modelDraft\.value\.mediaReferences/);
  assert.match(module, /选择已上传资质素材/);
  assert.match(module, /选择已发布制造素材/);
  assert.match(module, /loadMediaAssets/);
  assert.match(module, /loadMediaCandidates/);
  assert.match(module, /const everyday = \[loadPages\(\), loadSeries\(\), loadCompany\(\), loadEditorial\(\), loadMediaAssets\(\), loadMediaCandidates\(\)\];/);
  assert.doesNotMatch(module, /loadRepairPages\(\), loadMediaCandidates\(\), loadKnowledge\(\)/);
  assert.match(module, /if \(slug === 'home'\) return 'homepage';/);
  assert.match(module, /homepage: '网站主页'/);
  assert.match(module, /loadMediaPreviews/);
  assert.match(module, /loadMediaPreview/);
  assert.match(module, /responseType: 'blob'/);
  assert.match(module, /URL\.createObjectURL/);
  assert.match(module, /URL\.revokeObjectURL/);
  assert.match(module, /media-preview/);
  assert.match(module, /loadKnowledge/);
  assert.match(module, /normalizeKnowledge/);
  assert.match(module, /saveKnowledge/);
  assert.match(module, /addKnowledgeMediaReference/);
  assert.match(module, /removeKnowledgeMediaReference/);
  assert.match(module, /media: knowledgeDraft\.value\.mediaReferences/);
  assert.match(module, /filteredKnowledge/);
  assert.match(module, /contentQueueDefinitions/);
  assert.match(module, /loadReviewQueue/);
  assert.match(module, /loadSubmissionQueue/);
  assert.match(module, /review_note/);
  assert.match(module, /review-note-display/);
  assert.match(module, /Promise\.allSettled/);
  assert.match(module, /submitForReview/);
  assert.match(module, /restoreDraft/);
  assert.match(module, /filter\[status\]\[_in\]/);
  assert.match(module, /decideReview/);
  assert.match(module, /status: 'review', review_note/);
  assert.match(module, /status, review_note/);
  assert.match(module, /createMediaCandidate/);
  assert.match(module, /validateMediaFile/);
  assert.match(module, /api\.post\('\/files', form\)/);
  assert.match(module, /api\.post\('\/items\/media_assets'/);
  assert.match(module, /api\.patch\(`\/items\/knowledge_items/);
  assert.match(module, /status: 'draft'/);
  assert.match(module, /publication_state: 'unpublished'/);
  assert.match(module, /validateSettingLinks/);
  assert.match(module, /reviewedMediaAssets\('brand'\)/);
  assert.match(module, /requires_business_review/);
  assert.match(module, /validateSections/);
  assert.match(module, /requires_claim_review/);
  assert.match(module, /editableStatuses/);
  assert.match(module, /api\.patch\(`\/items\/pages/);
  assert.match(module, /api\.patch\(`\/items\/product_series/);
  assert.match(module, /name,positioning,presentation,scenarios/);
  assert.match(module, /product_series: \['id', 'series_code', 'slug', 'name', 'positioning', 'presentation', 'scenarios'/);
  assert.match(module, /presentation: seriesDraft\.value\.presentation/);
  assert.match(module, /cover_asset: seriesDraft\.value\.cover_asset/);
  assert.match(module, /api\.patch\(`\/items\/product_models/);
  assert.match(module, /api\.patch\(`\/items\/product_parameters/);
  assert.match(module, /api\.patch\(`\/items\/\$\{encodeURIComponent\(companyMode\.value\)\}/);
  assert.match(module, /api\.patch\(`\/items\/\$\{encodeURIComponent\(serviceMode\.value\)\}/);
  assert.match(module, /api\.patch\(`\/items\/site_settings/);
  assert.match(module, /api\.patch\(`\/items\/\$\{encodeURIComponent\(editorialMode\.value\)\}/);
  assert.match(module, /api\.post\(`\/items\/\$\{encodeURIComponent\(editorialMode\.value\)\}/);
  assert.match(module, /filter\[status\]\[_eq\]/);
  assert.match(module, /filter\[publication_state\]\[_eq\]/);
  assert.doesNotMatch(module, /date_created/);
  assert.match(module, /api\.post\('\/items\/product_parameters'/);
  assert.match(module, /内容版本审计/);
  assert.match(module, /网站主页/);
  assert.match(module, /产品展示/);
  assert.match(module, /先进制造/);
  assert.match(module, /视频新闻/);
  assert.match(module, /关于瑞钧/);
  assert.match(module, /服务支持/);
  assert.match(module, /key: 'product-resources', label: '产品资料区标题', sectionKey: 'resources'/);
  assert.match(module, /key: 'product-cases', label: '应用案例区标题', sectionKey: 'cases'/);
  assert.match(module, /key: 'news-dynamic-section', label: '动态新闻标题', sectionKey: 'dynamic-news'/);
  assert.match(module, /key: 'news-articles', label: '动态新闻内容', action: 'articles'/);
  assert.match(module, /sectionEmptyStateIsHiddenByRecords\(section\)/);
  assert.match(module, /空状态说明（仅当没有动态新闻时显示）/);
  assert.match(module, /当前已有动态新闻记录，空状态说明不会出现在官网画布中。/);
  assert.match(module, /同日排序/);
  assert.match(module, /sort=-display_date,sort_order,-id/);
  assert.match(module, /display_date: editorialDraft\.value\.display_date, sort_order:/);
  assert.match(module, /key: 'news-video-section', label: '视频分享标题', sectionKey: 'video-sharing'/);
  assert.match(module, /key: 'news-videos', label: '视频分享内容', action: 'videos'/);
  assert.match(module, /key: 'about-overview', label: '公司简介', sectionKey: 'overview'/);
  assert.match(module, /key: 'about-history-title', label: '发展历程标题', sectionKey: 'history'/);
  assert.match(module, /key: 'about-factory', label: '厂区风貌', sectionKey: 'factory'/);
  assert.match(module, /key: 'about-certificates', label: '认证证书', sectionKey: 'certificates'/);
  assert.match(module, /key: 'about-honors', label: '荣誉证书', sectionKey: 'honors'/);
  assert.match(module, /key: 'about-patents', label: '专利证书', sectionKey: 'patents'/);
  assert.match(module, /key: 'about-clients-global', label: '国外客户', sectionKey: 'clients-global'/);
  assert.match(module, /key: 'service-support', label: '瑞钧支持', sectionKey: 'support'/);
  assert.match(module, /key: 'service-models', label: '适用型号', sectionKey: 'support-models'/);
  assert.match(module, /key: 'service-actions', label: '服务入口', sectionKey: 'support-actions'/);
  assert.match(module, /selectSiteArea/);
  assert.match(module, /openSiteAreaEntry/);
  assert.match(module, /content-workbench-view/);
  assert.match(module, /ruijun-workbench-active/);
  assert.match(module, /document\.documentElement\.classList\.add/);
  assert.match(module, /document\.documentElement\.classList\.remove/);
  assert.match(module, /工作台导航覆盖 Directus 项目导航区域/);
  assert.match(module, /left: 56px/);
  assert.match(module, /width: 222px/);
  assert.match(module, /\.visual-canvas-focus>\.live-website-preview\{position:fixed!important;inset:64px 0 0!important;width:100%!important;height:calc\(100vh - 64px\)!important;z-index:120\}/);
  assert.match(module, /grid-template-columns: 222px minmax\(0, 1fr\)/);
  assert.doesNotMatch(module, /grid-template-columns: 0 minmax\(0, 1fr\)/);
  assert.match(module, /\.editor-page>\.wp-admin-menu\{[^}]*align-content:start/);
  assert.match(module, /\.editor-page>\.wp-admin-menu\{[^}]*grid-auto-rows:max-content[^}]*justify-content:start/);
  assert.match(module, /首页视频/);
  assert.match(module, /三大特点/);
  assert.match(module, /产品系列展示图/);
  assert.match(module, /时间轴/);
  assert.match(module, /homepage-product-task/);
  assert.match(module, /选型咨询/);
  assert.match(module, /修改首页底部联系区的标题、说明和按钮链接/);
  assert.match(module, /siteAreaContentMap/);
  assert.match(module, /data-section-key/);
  assert.match(module, /scrollIntoView/);
  assert.match(module, /三步完成一次更新/);
  assert.match(module, /从这里开始/);
  assert.match(module, /选择要修改的网站区块/);
  assert.match(module, /siteAreaEntryDescription/);
  assert.match(module, /这里按官网实际显示区块分类/);
  assert.match(module, /更多工具/);
  assert.match(module, /const activeTab = ref\('home'\)/);
  assert.match(module, /editor-start/);
  assert.match(module, /预览当前草稿/);
  assert.match(module, /更多工具/);
  assert.match(module, /常用内容/);
  assert.match(module, /编辑/);
  assert.match(module, /送审/);
  assert.match(module, /高级设置（一般无需修改）/);
  assert.match(module, /helpOpen/);
  assert.match(module, /selectTab/);
  assert.match(module, /previewOpen/);
  assert.match(module, /previewKind/);
  assert.match(module, /websitePreviewTarget/);
  assert.match(module, /content-preview-tokens\/issue/);
  assert.match(module, /:4175\/api\/preview\/open/);
  assert.match(module, /preview_open_url/);
  assert.match(module, /官网实时预览/);
  assert.match(module, /ruijun-live-website-preview/);
  assert.match(module, /@media\(min-width:821px\)\{\s*\.editor-page\.live-website-preview-active\{width:auto;margin-right:calc\(46vw \+ 20px\)\}/);
  assert.match(module, /margin-right:calc\(46vw \+ 20px\)/);
  assert.match(module, /@media\(min-width:821px\) and \(max-width:1180px\)\{\s*\.editor-page\.live-website-preview-active\{width:auto;margin-right:calc\(50vw \+ 20px\)\}/);
  assert.match(module, /\.editor-page\.live-website-preview-active \.workspace-grid/);
  assert.match(module, /\.editor-page\.live-website-preview-active \.editor-form/);
  assert.match(module, /\.editor-page\.live-website-preview-active \.workspace-grid\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(module, /min-width:0/);
  assert.match(module, /grid-template-columns:220px minmax\(0,1fr\) clamp\(460px,38vw,920px\)/);
  assert.doesNotMatch(module, /grid-template-columns:220px minmax\(0,1fr\) minmax\(420px,46vw\)/);
  assert.match(module, /\.editor-page\.live-website-preview-active>\.live-website-preview/);
  assert.match(module, /grid-column:3/);
  assert.match(module, /ruijun:cms-preview:update/);
  assert.match(module, /sectionKey: websitePreviewContext\.value\.sectionKey/);
  assert.match(module, /watch\(activePageSectionKey, \(\) => queueLivePreviewUpdate\(\)\)/);
  assert.match(module, /watch\(visualTool, \(\) => postLivePreviewUpdate\(\)\)/);
  assert.match(module, /watch\(visualDevice, \(\) => postLivePreviewUpdate\(\)\)/);
  assert.match(module, /window\.setTimeout\(\(\) => \{[\s\S]{0,300}postLivePreviewUpdate\(updateTarget\);[\s\S]{0,80}\}, 80\)/);
  assert.match(module, /event\.origin !== livePreviewWebsiteOrigin\.value/);
  assert.match(module, /previewSafeRecord/);
  assert.doesNotMatch(module, /localStorage|sessionStorage/);
  assert.match(module, /草稿预览/);
  assert.match(module, /有未保存修改/);
  assert.match(module, /currentDraftFingerprint/);
  assert.match(module, /confirmDiscardChanges/);
  assert.match(module, /当前内容有未保存的修改/);
  assert.match(module, /requestReload/);
  assert.match(module, /beforeunload/);
  assert.match(module, /handleBeforeUnload/);
  assert.match(module, /page-preview/);
  assert.match(module, /article-preview/);
  assert.match(module, /product-preview/);
  assert.match(module, /提交审核/);
  assert.match(module, /恢复草稿/);
  assert.match(module, /知识库同步状态（系统维护）/);
  assert.match(module, /knowledgeSyncStatusLabel/);
  assert.match(module, /暂不满足同步条件/);
  assert.doesNotMatch(module, /<small>\/\{\{ page\.slug \}\}<\/small>/);
  assert.doesNotMatch(module, /SUBMIT FOR REVIEW|RESTORE DRAFT/);
  assert.doesNotMatch(module, />STRUCTURED CONTENT EDITOR</);
  assert.doesNotMatch(module, />PRODUCT SERIES</);
  assert.doesNotMatch(module, /CMS_BFF_TOKEN|CMS_WRITE_TOKEN|ADMIN_PASSWORD/);
  assert.match(module, /repair_page_configs/);
  assert.match(module, /repair_home/);
  assert.match(module, /action_cards/);
  assert.match(module, /saveRepairPage/);
  assert.match(module, /loadRepairPages/);
  assert.match(module, /repair-page-preview/);
});

test('workbench labels the home record as the website home instead of reusing its hero copy as a page name', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');

  assert.match(module, /function pageDisplayName\(page\) \{[\s\S]*if \(slug === 'home'\) return '网站主页';/);
  assert.match(module, /\{\{ pageDisplayName\(page\) \}\}/);
  assert.match(module, /\{\{ pageDisplayName\(pageDraft\) \}\}/);
  assert.match(module, /page: pageDisplayName\(pageDraft\.value\)/);
  assert.match(module, /if \(collection === 'pages'\) return pageDisplayName\(record\);/);
});

test('about hero media editor exposes the shared backdrop role used by the website', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /<option value="backdrop">首屏共享背景<\/option>/);
  assert.match(module, /<option value="background">首屏背景图层<\/option>/);
  assert.match(module, /<option value="foreground">首屏机器前景<\/option>/);
});

test('about hero canvas media uses independent governed placements for the background and machine foreground', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /slug === 'about' && element\.mediaRole === 'foreground' \? 'about\.hero\.foreground'/);
  assert.match(module, /slug === 'about' \? 'about\.hero\.background'/);
  assert.match(module, /\{ key: 'about\.hero\.background', label: '关于瑞钧首屏背景', mediaType: 'image', minWidth: 1920, minHeight: 900/);
  assert.match(module, /\{ key: 'about\.hero\.foreground', label: '关于瑞钧首屏机器图', mediaType: 'image', minWidth: 800, minHeight: 600/);
});

test('product-series cover selections use the governed product gallery placement', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /if \(collection === 'product_series' && String\(element\.mediaRole \|\| ''\)\.trim\(\) === 'cover'\) \{[\s\S]*placementKey: 'product\.gallery\.image'/);
});

test('homepage shared timeline media uses the governed about-timeline placements', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /'history': \(slug === 'home' \|\| slug === 'about'\) \? \(element\.mediaRole === 'icon' \? 'about\.timeline\.icon' : 'about\.timeline\.background'\)/);
  assert.match(module, /pageKey: slug === 'home' && String\(element\.sectionKey \|\| ''\)\.trim\(\) === 'history' \? '' : slug/);
});

test('service office region images and maps use distinct governed placements', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /'office-directory': element\.mediaRole === 'map' \? 'service\.office\.map' : 'service\.office\.image'/);
});

test('manufacturing PSD page layers use their own governed media placement in form and canvas filters', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /manufacturing\.layer\.image.*制造页面 PSD 图层图片/);
  assert.match(module, /'precision-machining': 'manufacturing\.layer\.image'/);
  assert.match(module, /'smart-warehouse': 'manufacturing\.layer\.image'/);
  assert.match(module, /pageKey: slug === 'home' && String\(element\.sectionKey \|\| ''\)\.trim\(\) === 'history' \? '' : slug,\s*sectionKey: String\(element\.sectionKey \|\| ''\)\.trim\(\)/);
});

test('video share media form keeps poster and transcript optional while preserving required hero posters', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /:required="Boolean\(selectedMediaPlacement\?\.posterRequired\)"/);
  assert.match(module, /未填写使用视频首帧/);
  assert.match(module, /视频分享可选；教学视频和首屏说明建议填写/);
});

test('canvas selection keeps the current product preview when Directus serializes its id as text', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');

  // Canvas postMessage payloads carry item IDs as strings, while Directus list
  // records may expose numeric IDs. A same-record selection must not clear the
  // active model and unmount the live preview iframe.
  assert.match(module, /const record = models\.value\.find\(\(item\) => String\(item\.id\) === String\(id\)\);/);
  assert.match(module, /if \(collection === 'product_models' && activeTab\.value === 'models' && String\(selectedModelId\.value\) === String\(resolvedItemId\) && modelDraft\.value\) \{[\s\S]*?return resolved;/);
});

test('ordinary product models do not expose workstation-only copy that their Nuxt canvas cannot render', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');

  assert.match(module, /const modelSupportsWorkstationIntro = computed\(\(\) => String\(modelDraft\.value\?\.series_code \|\| ''\)\.trim\(\) === 'workstation'\);/);
  assert.match(module, /<section v-if="modelSupportsWorkstationIntro" class="section-editor" aria-labelledby="model-intro-title">/);
  assert.match(module, /v-else class="read-only-note">当前型号在官网使用“型号导航与核心能力”模板，没有工作站介绍展示位。<\/p>/);
});

test('page section normalization materializes the controlled label field for canvas writes', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /kicker: typeof section\.kicker === 'string' \? section\.kicker : '',\s*label: typeof section\.label === 'string' \? section\.label : '',\s*title:/);
});

test('home page normalization materializes the controlled hero video field inside the persisted hero section', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /if \(record\.slug === 'home'\) \{\s*const hero = sections\.find\(\(section\) => String\(section\?\.id \|\| ''\) === 'hero'\);\s*if \(hero\) hero\.hero_video_asset_id = String\(hero\.hero_video_asset_id \|\| ''\);\s*\}/);
  assert.doesNotMatch(module, /normalized\.hero_video_asset_id/);
});

test('page saves compact unbound canvas media slots before writing sections to Directus', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /async function savePage\(\) \{[\s\S]*const persistedSections = normalizeSections\(pageDraft\.value\.sections\);[\s\S]*sections: persistedSections/);
});

test('visual property panel exposes bounded card sorting, duplication, and deletion', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /getVisualListReorder/);
  assert.match(module, /duplicateVisualListItem/);
  assert.match(module, /moveVisualListItem/);
  assert.match(module, /removeVisualListItem/);
  assert.match(module, /v-if="selectedVisualListReorder" class="visual-list-order"/);
  assert.match(module, /@click="duplicateSelectedVisualListItem"/);
  assert.match(module, /@click="removeSelectedVisualListItem"/);
  assert.match(module, /@click="moveSelectedVisualListItem\(-1\)"/);
  assert.match(module, /@click="moveSelectedVisualListItem\(1\)"/);
  assert.match(module, /function moveSelectedVisualListItem\(direction\) \{[\s\S]*moveVisualListItem\(target, fieldPath, direction\)[\s\S]*selectedVisualElement\.value = \{[\s\S]*fieldPath: moved\.fieldPath/);
  assert.match(module, /function duplicateSelectedVisualListItem\(\) \{[\s\S]*duplicateVisualListItem\(target, fieldPath\)/);
  assert.match(module, /function removeSelectedVisualListItem\(\) \{[\s\S]*removeVisualListItem\(target, fieldPath\)/);
});

test('homepage sections use a native structured Directus interface instead of a JSON code editor', async () => {
  const [plan, manifest, component] = await Promise.all([
    readFile(new URL('schema/directus-schema-plan.mjs', root), 'utf8'),
    readFile(new URL('extensions/homepage-sections-interface/package.json', root), 'utf8'),
    readFile(new URL('extensions/homepage-sections-interface/src/interface.vue', root), 'utf8')
  ]);
  assert.match(plan, /'pages\.sections': 'ruijun-homepage-sections'/);
  assert.equal(JSON.parse(manifest)['directus:extension'].type, 'interface');
  assert.match(component, /官网首页内容/);
  assert.match(component, /三大理由总标题/);
  assert.match(component, /产品卡片|产品/);
  assert.match(component, /时间轴/);
  assert.match(component, /底部行动按钮/);
  assert.match(component, /emit\('input'/);
});

test('visual editing exposes a bound-element property panel and governed media replacement workflow', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /visual-property-panel/);
  assert.match(module, /selectedVisualElement/);
  assert.match(module, /fieldPath/);
  assert.match(module, /媒体替换/);
  assert.match(module, /visualMediaSelection/);
  assert.match(module, /media_asset_id/);
  assert.match(module, /ruijun:cms-preview:media-replace/);
  assert.match(module, /layout\.desktop\.offset_x/);
  assert.match(module, /device: visualDevice\.value/);
  assert.match(module, /text_style/);
  assert.match(module, /setVisualTextStyle/);
  assert.match(module, /setVisualAlignment/);
  assert.match(module, /max="120"/);
});

test('visual media slots show only matching approved media or private draft preview candidates', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /selectedVisualIsMedia && visualMediaOptions\.length/);
  assert.match(module, /isVisualMediaSelection/);
  assert.match(module, /草稿素材，仅当前内部预览/);
  assert.match(module, /filterPreviewStagingMediaAssets/);
  assert.match(module, /当前没有符合该展示位置的已审核媒体或内部预览草稿/);
  assert.match(module, /待媒体/);
  assert.match(module, /getVisualMediaAssetId\(fieldTarget, fieldPath, \{ mediaSlot:/);
});

test('visual property panel preserves the preview-provided reason for a read-only target', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /readonlyReason: String\(event\.data\.readonlyReason \|\| '请先在媒体资产中导入、审核并发布后再替换。'\)/);
});

test('core equipment canvas images use their fixed-card media placement instead of the full gallery rule', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /'core-equipment': element\.elementType === 'video' \? 'manufacturing\.gallery\.video' : 'manufacturing\.equipment\.image'/);
  assert.match(module, /\{ key: 'manufacturing\.equipment\.image', label: '生产核心设备卡图', mediaType: 'image', minWidth: 740, minHeight: 415/);
});

test('service hero canvas background uses its own governed media placement', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /slug === 'service' \? 'service\.hero\.image'/);
  assert.match(module, /\{ key: 'service\.hero\.image', label: '服务支持首屏背景', mediaType: 'image', minWidth: 1920, minHeight: 960/);
});

test('about timeline canvas background uses its own governed media placement', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /'history': \(slug === 'home' \|\| slug === 'about'\) \? \(element\.mediaRole === 'icon' \? 'about\.timeline\.icon' : 'about\.timeline\.background'\)/);
  assert.match(module, /\{ key: 'about\.timeline\.background', label: '关于页时间轴背景'/);
});

test('homepage reason canvas media uses section-specific governed placements', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /home\.reason\.machine/);
  assert.match(module, /home\.reason\.background/);
});

test('media upload form exposes every currently supported homepage reason and service action placement', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /\{ key: 'home\.reason\.background', label: '首页三大特点背景', mediaType: 'image', minWidth: 1600, minHeight: 900/);
  assert.match(module, /\{ key: 'home\.reason\.icon', label: '首页横移图标', mediaType: 'image', minWidth: 80, minHeight: 96/);
  assert.match(module, /\{ key: 'home\.reason\.machine', label: '首页三大特点设备前景', mediaType: 'image', minWidth: 160, minHeight: 240/);
  assert.match(module, /\{ key: 'service\.action\.icon', label: '服务入口图标', mediaType: 'image', minWidth: 34, minHeight: 42/);
});

test('media upload form uses the same minimum source dimensions as governance for about galleries and qualifications', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /\{ key: 'qualification\.image', label: '证书或资质图片', mediaType: 'image', minWidth: 365, minHeight: 410/);
  assert.match(module, /\{ key: 'about\.gallery\.image', label: '关于页厂区图库', mediaType: 'image', minWidth: 792, minHeight: 446/);
  assert.match(module, /\{ key: 'about\.client\.image', label: '关于页客户图片', mediaType: 'image', minWidth: 542, minHeight: 406/);
});

test('media upload placement selection pre-fills an explicit video-sharing context instead of splitting the placement key', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /@change="applyMediaPlacementContext\(mediaDraft\.placement_key, true\)"/);
  assert.match(module, /'news\.video_share\.list': \{ pageKey: 'news', sectionKey: 'video-sharing' \}/);
  assert.match(module, /function applyMediaPlacementContext\(placementKey, force = false\) \{/);
  assert.doesNotMatch(module, /const \[pageKey, sectionKey\] = mediaDraft\.value\.placement_key\.split\('\.'\);/);
});

test('page drafts can attach matching private preview media without presenting it as publicly selectable', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /function pageMediaOptions\(scope\)/);
  assert.match(module, /filterPreviewStagingMediaAssets\(mediaCandidates\.value, \{ scope \}\)/);
  assert.match(module, /function isPageMediaOption\(assetId, scope\)/);
  assert.match(module, /草稿素材，仅当前内部预览/);
  assert.match(module, /内部预览草稿/);
});

test('empty page media slots are shown as website defaults rather than unverified asset references', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /function pageMediaLabel\(reference\) \{[\s\S]*if \(!String\(reference\.media_asset_id \?\? ''\)\.trim\(\)\) return '沿用官网默认图案';/);
  assert.match(module, /当前引用 \$\{reference\.media_asset_id\}（尚未通过此选择器验证）/);
});

test('media selectors prefer the CMS asset title so same-named files remain distinguishable', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /function mediaAssetLabel\(asset\) \{\s*const title = String\(asset\?\.title \|\| ''\)\.trim\(\);\s*const filename = String\(asset\?\.original_file_name \|\| `素材 \$\{asset\?\.id \|\| ''\}`\)\.trim\(\);\s*return `\$\{title \|\| filename\} · \$\{filename\} · \$\{asset\?\.mime_type \|\| '未知类型'\}`;/);
});

test('product drawing draft media is resolved into the live canvas record before the iframe receives it', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /const drawingMedia = previewMediaAsset\(drawing\?\.media_asset_id\)/);
  assert.match(module, /configuration\.drawings = parseArray\(configuration\.drawings\)\.map\(\(drawing\) => \{[\s\S]*return drawingMedia \? \{ \.\.\.drawing, \.\.\.drawingMedia \} : drawing;/);
});

test('product download resources can select an uploaded document asset instead of requiring a hand-written URL', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /产品附件<select v-model="resource\.media_asset_id"/);
  assert.match(module, /function productResourceMediaAssets\(\)[\s\S]*filterPreviewStagingMediaAssets/);
  assert.match(module, /resources: parseArray\(record\.resources\)\.map\(\(item\) => \(\{ title: String\(item\?\.title \|\| ''\), type: String\(item\?\.type \|\| ''\), url: String\(item\?\.url \|\| item\?\.path \|\| ''\), media_asset_id: String\(item\?\.media_asset_id \|\| ''\) \}\)\)/);
  assert.match(module, /media_asset_id: item\.media_asset_id \|\| null/);
});

test('service resource downloads can select an uploaded service document draft for internal preview', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /受控下载文件[\s\S]*<select v-model="serviceDraft\.asset"[\s\S]*serviceResourceMediaAssets\(serviceDraft\.type\)/);
  assert.match(module, /function serviceResourceMediaAssets\(type = serviceDraft\.value\?\.type\)/);
  assert.match(module, /function serviceResourceMediaAssetLabel\(asset, type = serviceDraft\.value\?\.type\)/);
  assert.match(module, /仅内部预览下载/);
});

test('service resources select only their governed video or document draft candidates', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /function serviceResourceMediaPlacement\(type\)[\s\S]*service\.tutorial\.video[\s\S]*service\.document/);
  assert.match(module, /function serviceResourceMediaAssets\(type = serviceDraft\.value\?\.type\)[\s\S]*elementType: isVideo \? 'video' : ''/);
  assert.match(module, /serviceResourceMediaAssets\(serviceDraft\.type\)/);
  assert.match(module, /serviceResourceMediaAssetLabel\(asset, serviceDraft\.type\)/);
});

test('service tutorial covers use their own governed poster placement, including matching internal-preview drafts', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /service\.tutorial\.poster/);
  assert.match(module, /function serviceTutorialPosterAssets\(\)[\s\S]*editableMediaAssetsForPlacement\('service', 'service\.tutorial\.poster', 'image'\)/);
  assert.match(module, /serviceDraft\.cover_asset && !isServiceTutorialPosterAsset\(serviceDraft\.cover_asset\)/);
  assert.match(module, /v-for="asset in serviceTutorialPosterAssets\(\)"/);
  assert.match(module, /serviceTutorialPosterAssetLabel\(asset\)/);
});

test('service resource live previews materialize the selected document and cover through the protected media proxy', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /collection === 'service_resources'[\s\S]*const asset = previewMediaAsset\(record\.asset\?\.media_asset_id \|\| record\.asset\)/);
  assert.match(module, /const coverAsset = previewMediaAsset\(record\.cover_asset\?\.media_asset_id \|\| record\.cover_asset\)/);
  assert.match(module, /record\.asset_media_asset_id = asset\.media_asset_id;/);
  assert.match(module, /record\.cover_media_asset_id = coverAsset\.media_asset_id;/);
  assert.match(module, /service_resources: \['id',[\s\S]*'asset_media_asset_id', 'cover_media_asset_id'/);
});

test('draft media sent from the workbench to Nuxt uses the private preview-media proxy instead of a Directus asset URL', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /path: `\/api\/preview\/media\/\$\{encodeURIComponent\(String\(asset\.id\)\)\}`/);
  assert.match(module, /posterPath: `\/api\/preview\/media\/\$\{encodeURIComponent\(String\(poster\.id\)\)\}`/);
  assert.doesNotMatch(module, /path: `\$\{window\.location\.origin\}\/assets\/\$\{encodeURIComponent\(asset\.file_id\)\}`/);
});

test('opening the visual property panel reserves canvas width instead of covering it', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /:class="\{ 'visual-property-panel-open': selectedVisualElement \}"/);
  assert.match(module, /--visual-property-panel-width:clamp\(200px,34%,300px\)/);
  assert.match(module, /\.live-website-preview\.visual-property-panel-open \.visual-canvas-viewport\{right:var\(--visual-property-panel-width\)\}/);
  assert.match(module, /\.visual-property-panel\{[^}]*width:var\(--visual-property-panel-width\)/);
});

test('the visual editor toolbar uses stable rows inside the bounded preview column', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /--visual-toolbar-height:136px/);
  assert.match(module, /\.visual-editor-toolbar\{[^}]*grid-template-columns:minmax\(0,1fr\)[^}]*min-height:var\(--visual-toolbar-height\)/);
  assert.match(module, /\.visual-editor-tools\{[^}]*grid-row:2[^}]*overflow-x:auto/);
  assert.match(module, /\.visual-editor-actions\{[^}]*grid-row:3[^}]*overflow-x:auto/);
  assert.match(module, /\.visual-canvas-viewport\{[^}]*inset:var\(--visual-toolbar-height\) 0 0/);
  assert.match(module, /\.visual-property-panel\{[^}]*top:var\(--visual-toolbar-height\)/);
  assert.match(module, /\.live-website-preview>header\.visual-editor-toolbar\{display:grid;grid-template-columns:minmax\(0,1fr\);[^}]*min-height:var\(--visual-toolbar-height\);height:var\(--visual-toolbar-height\)!important/);
  assert.match(module, /\.live-preview-error\{top:var\(--visual-toolbar-height\)!important\}/);
});

test('desktop visual preview stays within the Directus shell at 1440px', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /grid-template-columns:220px minmax\(0,1fr\) clamp\(460px,38vw,920px\)/);
  assert.match(module, /grid-template-columns: 222px minmax\(0, 1fr\) clamp\(460px, 38vw, 920px\)/);
  assert.doesNotMatch(module, /grid-template-columns:220px minmax\(520px,1fr\) clamp\(720px,38vw,920px\)/);
  assert.match(module, /\.editor-page\.live-website-preview-active \.editor-form \.field-grid\{grid-template-columns:1fr\}/);
  assert.match(module, /--visual-property-panel-width:clamp\(200px,34%,300px\)/);
  assert.match(module, /html\.ruijun-workbench-active \.live-website-preview \.visual-canvas-viewport > iframe\{width:var\(--canvas-width\)!important\}/);
});

test('1440px visual editing keeps the form above an in-flow preview instead of squeezing it behind preview chrome', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /@media\(min-width:1280px\) and \(max-width:1599px\)\{[\s\S]*?grid-template-columns:176px minmax\(0,1fr\);[\s\S]*?\.live-website-preview\{position:relative!important;[\s\S]*?grid-column:2;grid-row:5/);
  assert.match(module, /@media\(min-width:1280px\) and \(max-width:1599px\)\{[\s\S]*?\.editor-page\.live-website-preview-active \.model-layout\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(module, /@media\(min-width:1600px\)\{[\s\S]*?grid-template-columns:222px minmax\(400px,\.85fr\) minmax\(640px,1\.15fr\)/);
});

test('medium desktop visual editing keeps the workbench menu in flow so it cannot cover canvas controls', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /@media\(min-width:901px\) and \(max-width:1279px\)\{[\s\S]*?\.editor-page\.live-website-preview-active>\.wp-admin-menu\{position:static!important;[\s\S]*?z-index:auto!important;[\s\S]*?grid-column:1!important/);
});

test('fixed desktop workbench navigation reserves the header and guide column before live preview opens', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /html\.ruijun-workbench-active \.editor-page:not\(\.live-website-preview-active\) \{[\s\S]*grid-template-columns: 238px minmax\(0, 1fr\);/);
  assert.match(module, /@media \(min-width: 901px\) \{[\s\S]*html\.ruijun-workbench-active \.editor-page:not\(\.live-website-preview-active\) > \.toolbar,[\s\S]*html\.ruijun-workbench-active \.editor-page:not\(\.live-website-preview-active\) > \.editor-guide,[\s\S]*html\.ruijun-workbench-active \.editor-page:not\(\.live-website-preview-active\) > \.message,[\s\S]*html\.ruijun-workbench-active \.editor-page:not\(\.live-website-preview-active\) > \.retry-save-action \{[\s\S]*grid-column: 2;[\s\S]*margin-left: 16px;/);
});

test('form edits enter the same visual history without duplicating undo snapshots', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /watch\(\(\) => currentDraftState\(\), \(next, previous\) => \{[\s\S]*recordVisualHistory\(\);[\s\S]*\}, \{ deep: true, flush: 'post' \}\)/);
  assert.match(module, /let suppressDraftHistory = false/);
  assert.match(module, /if \(suppressDraftHistory\) return/);
});

test('discarding visual changes immediately resynchronizes the live iframe', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /function discardVisualChanges\(\) \{[\s\S]*markDraftSaved\(\);[\s\S]*postLivePreviewUpdate\(\);[\s\S]*\}/);
});

test('visual draft save exposes a retry action without discarding the local draft', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /v-if="error && retrySaveAction"/);
  assert.match(module, /重新保存/);
  assert.match(module, /const retrySaveAction = ref\(null\)/);
  assert.match(module, /async function retrySave\(\)/);
  assert.match(module, /retrySaveAction\.value = saveVisualDraft/);
  assert.match(module, /async function saveVisualDraft\(\)/);
});

test('visual text property input syncs the live iframe before the field loses focus', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /<textarea[^>]+:value="selectedVisualFieldValue"[^>]+@input="commitVisualField\(\$event\.target\.value\)"/);
  assert.doesNotMatch(module, /<textarea[^>]+:value="selectedVisualFieldValue"[^>]+@change="commitVisualField/);
});

test('visual property edits explain rejected numeric or controlled-field input without discarding the current value', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /const normalizedValue = options\.length \? options\.find\(\(option\) => option\.value === value\)\?\.value : value;[\s\S]*if \(normalizedValue == null \|\| !setVisualFieldValue\(target, path, normalizedValue\)\) \{[\s\S]*error\.value = '请输入有效数值或符合字段格式的内容。';[\s\S]*return;[\s\S]*\}/);
  assert.match(module, /if \(error\.value === '请输入有效数值或符合字段格式的内容。'\) error\.value = '';/);
});

test('page visual edits resolve the active page draft instead of the stale page-list record', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /pages:\s*preferVisualDraftRecord\(pages\.value, pageDraft\.value\)/);
  assert.match(module, /resolveActiveVisualEditingTarget\(websitePreviewTarget\.value, resolved, selection\)/);
  assert.match(module, /resolveVisualFieldTarget\(selectedVisualRecord\.value\?\.record, selectedVisualElement\.value \|\| \{\}\)/);
});

test('switching elements on the same page canvas keeps unsaved page edits instead of reloading the saved record', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /if \(collection === 'pages' && activeTab\.value === 'pages' && String\(selectedPageId\.value\) === String\(resolvedItemId\) && pageDraft\.value\) \{\s*activePageSectionKey\.value = String\(selection\.sectionKey \|\| activePageSectionKey\.value \|\| ''\);\s*return resolved;\s*\}/);
  assert.match(module, /if \(collection === 'pages'\) \{\s*activeTab\.value = 'pages';\s*selectPage\(resolvedItemId, true\);/);
});

test('visual text property input supports text-bound command buttons', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /selectedVisualElement\.elementType === 'text' \|\| selectedVisualElement\.elementType === 'button'/);
});

test('article category uses the controlled news or video selector in the canvas property panel', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /const selectedVisualFieldOptions = computed\(\(\) => \{[\s\S]*collection === 'articles'[\s\S]*fieldPath === 'category'[\s\S]*value: 'news'[\s\S]*value: 'video'/);
  assert.match(module, /v-if="selectedVisualFieldOptions\.length" class="visual-property-field">内容类型<select[^>]+@change="commitVisualField\(\$event\.target\.value\)"/);
  assert.match(module, /v-else-if="selectedVisualElement\.fieldPath && \(selectedVisualElement\.elementType === 'text' \|\| selectedVisualElement\.elementType === 'button'\)" class="visual-property-field">文字内容<textarea/);
});

test('visual button properties expose and validate the explicitly bound destination link', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /selectedVisualElement\.elementType === 'button' && selectedVisualElement\.linkFieldPath/);
  assert.match(module, /aria-label="按钮链接"/);
  assert.match(module, /:value="selectedVisualLinkValue"/);
  assert.match(module, /@input="commitVisualLink\(\$event\.target\.value\)"/);
  assert.match(module, /function commitVisualLink\(value\)/);
  assert.match(module, /normalized && !isValidSiteLink\(normalized\)/);
  assert.match(module, /setVisualFieldValue\(selectedVisualTarget\.value, path, normalized\)/);
});

test('live preview sends a freshly built snapshot after an indirect nested visual edit', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /function buildLivePreviewRecord\(target = websitePreviewTarget\.value\)/);
  assert.match(module, /function postLivePreviewUpdate\(forcedTarget = null\) \{[\s\S]{0,600}const pageTarget = websitePreviewTarget\.value;[\s\S]{0,600}const selected = forcedTarget \|\| selectedVisualRecord\.value;[\s\S]{0,600}const target = selected && \(String\(selected\.collection\) !== String\(pageTarget\?\.collection \|\| ''\) \|\| selected\.record !== pageTarget\?\.record\) \? selected : pageTarget;[\s\S]{0,600}const preview = buildLivePreviewRecord\(target\);/);
  assert.match(module, /function queueLivePreviewUpdate\(target = null\) \{[\s\S]*const explicitTarget = target\?\.collection && target\?\.record \? target : null;[\s\S]*if \(explicitTarget\) pendingLivePreviewTarget = explicitTarget;[\s\S]*const updateTarget = pendingLivePreviewTarget \|\| explicitTarget;[\s\S]*pendingLivePreviewTarget = null;[\s\S]*postLivePreviewUpdate\(updateTarget\);/);
  assert.match(module, /function commitVisualField\(value\) \{[\s\S]*queueLivePreviewUpdate\(selectedVisualRecord\.value\);/);
  assert.match(module, /watch\(currentLivePreviewRecord, \(\) => queueLivePreviewUpdate\(\), \{ deep: true \}\)/);
  assert.doesNotMatch(module, /function postLivePreviewUpdate\(forcedTarget = null\) \{[\s\S]{0,220}const preview = currentLivePreviewRecord\.value;/);
});

test('visual text commit immediately posts the current page snapshot before reactive watchers can supersede its debounce', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /function commitVisualField\(value\) \{[\s\S]*recordVisualHistory\(\);[\s\S]*postLivePreviewUpdate\(selectedVisualRecord\.value\);/);
});

test('live preview materializes governed media for every supported record snapshot', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /import \{ materializeVisualMediaRecord \} from '\.\/visual-preview-media\.js';/);
  assert.match(module, /collection === 'articles'/);
  assert.match(module, /record\.media = normalizeMediaReferences\(record\.mediaReferences \|\| record\.media \|\| \[\]\)\.flatMap/);
  assert.match(module, /const media = previewMediaAsset\(reference\.media_asset_id\)/);
  assert.match(module, /return previewSafeRecord\(collection, materializeVisualMediaRecord\(record, previewMediaAsset\)\);/);
  assert.match(module, /posterPath: `\/api\/preview\/media\/\$\{encodeURIComponent\(String\(poster\.id\)\)\}`/);
  assert.match(module, /product_parameters: \['id', 'model_code', 'group_name', 'field_name', 'value', 'unit', 'presentation', 'sort_order', 'status', 'publication_state'\]/);
});

test('live preview resolves a persisted private draft asset after the candidate list finishes loading', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /const stagingAsset = mediaCandidates\.value\.find\(\(item\) => String\(item\.id\) === String\(assetId\) && isPreviewStagingMedia\(item\)\);/);
  assert.match(module, /const asset = previewableMediaAssets\.value\.find\(\(item\) => String\(item\.id\) === String\(assetId\)\) \|\| stagingAsset;/);
});

test('homepage visual preview sends a transient resolved URL while retaining the persisted video asset id', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /const hero = record\.sections\.find\(\(section\) => String\(section\?\.id \|\| ''\) === 'hero'\);/);
  assert.match(module, /hero\.hero_video_asset_url = heroVideo\.path;/);
});

test('video article media canvas inherits the governed news video placement', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /collection === 'articles'/);
  assert.match(module, /media\\\.\\d\+\\\.path/);
  assert.match(module, /collection === 'articles' && articleMediaField && String\(element\.elementType \|\| ''\) === 'video'/);
  assert.match(module, /news\.video_share\.list/);
  assert.match(module, /pageKey: 'news'/);
  assert.match(module, /sectionKey: 'video-sharing'/);
});

test('live visual edits reach the iframe within the immediate-preview budget', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  const delay = Number(module.match(/postLivePreviewUpdate\(updateTarget\);[\s\S]{0,100}?\}, (\d+)\)/)?.[1]);
  assert.ok(Number.isFinite(delay), 'live preview debounce must be explicit');
  assert.ok(delay <= 100, `live preview debounce must be <= 100ms, received ${delay}ms`);
});

test('opening the visual preview enables canvas editing only when the current viewport allows it', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  const startPreview = module.match(/async function startLiveWebsitePreview\([^)]*\) \{([\s\S]*?)\n\}/)?.[1] || '';
  assert.match(startPreview, /liveWebsitePreviewVisible\.value = true/);
  assert.match(startPreview, /visualEditMode\.value = visualCanvasEditable\.value/);
});

test('reconnecting live preview cannot let a stale page token overwrite the current canvas target', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  const startPreview = module.match(/async function startLiveWebsitePreview\([^)]*\) \{([\s\S]*?)\n\}/)?.[1] || '';
  const activateTarget = module.match(/function activateVisualEditingTarget\(selection(?:, \{ discardConfirmed = false \} = \{\})?\) \{([\s\S]*?)\n\}/)?.[1] || '';

  assert.match(module, /let livePreviewRequestSequence = 0;/);
  assert.match(startPreview, /const requestSequence = \+\+livePreviewRequestSequence;/);
  assert.match(startPreview, /const targetSnapshot = \{ collection: String\(target\.collection\), record: clone\(target\.record\) \};/);
  assert.match(startPreview, /const contextSnapshot = target\.context \|\| websitePreviewContextFor\(targetSnapshot\);/);
  assert.match(startPreview, /if \(requestSequence !== livePreviewRequestSequence\) return;/);
  assert.match(startPreview, /submitPreviewToken\(openUrl, data\.token, 'ruijun-live-website-preview', contextSnapshot\);/);
  assert.match(activateTarget, /collection !== 'pages'/);
});

test('live preview keeps the token form mounted until the iframe POST navigation is queued', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  const submitPreview = module.match(/function submitPreviewToken\([\s\S]*?\n\}/)?.[0] || '';
  assert.match(submitPreview, /document\.body\.append\(form\);\s*form\.submit\(\);/);
  assert.match(submitPreview, /window\.setTimeout\(\(\) => form\.remove\(\), 0\);/);
  assert.doesNotMatch(submitPreview, /form\.submit\(\);\s*form\.remove\(\);/);
});

test('visual preview is opt-in so it cannot cover the initial editing workflow', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /const liveWebsitePreviewVisible = ref\(false\);/);
});

test('an expired live-preview token automatically renews once while preserving the active editing draft', async () => {
  const [module, preview] = await Promise.all([
    readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8'),
    readFile(new URL('../../website/composables/useCmsDraftPreview.ts', import.meta.url), 'utf8')
  ]);
  assert.match(preview, /CMS_LIVE_PREVIEW_EXPIRED/);
  assert.match(preview, /isCmsLivePreviewSessionExpired/);
  assert.match(module, /let livePreviewAutoRenewedForFrame = false;/);
  assert.match(module, /let livePreviewAutoRenewInFlight = false;/);
  assert.match(module, /async function renewLiveWebsitePreview\(\) \{[\s\S]*livePreviewAutoRenewedForFrame = true;[\s\S]*await startLiveWebsitePreview\(\{ automatic: true \}\);/);
  assert.match(module, /event\.data\?\.type === 'ruijun:cms-preview:expired'/);
  assert.match(module, /if \(livePreviewAutoRenewInFlight\) return;/);
  assert.match(module, /void renewLiveWebsitePreview\(\);/);
  assert.match(module, /实时预览授权已到期，正在自动恢复。未保存修改仍保留。/);
  assert.match(module, /if \(!automatic\) livePreviewAutoRenewedForFrame = false;/);
  assert.match(module, /livePreviewAutoRenewedForFrame = false;[\s\S]*postLivePreviewUpdate\(\);/);
});

test('expired preview notice remains visible without blocking the reconnect control', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /\.live-preview-error\{[^}]*pointer-events:none/);
});

test('article same-day order preserves an unset value instead of silently writing zero', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /function normalizeOptionalSortOrder\(value\)/);
  assert.match(module, /sort_order: normalizeOptionalSortOrder\(record\.sort_order\)/);
  assert.match(module, /<label>同日排序<input v-model\.number="editorialDraft\.sort_order"[^>]*placeholder="留空表示按系统默认顺序"/);
  assert.match(module, /const sortOrder = normalizeOptionalSortOrder\(editorialDraft\.value\.sort_order\);/);
  assert.match(module, /sort_order: sortOrder/);
});

test('editorial cleanup only exposes deletion for an unpublished draft and clears its canvas state', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /v-if="canDeleteEditorialDraft\(editorialDraft\)"[\s\S]*@click="deleteEditorialDraft"/);
  assert.match(module, /function canDeleteEditorialDraft\(record\) \{\s*return Boolean\(record\?\.id\) && record\.status === 'draft' && record\.publication_state === 'unpublished';\s*\}/);
  assert.match(module, /async function deleteEditorialDraft\(\) \{[\s\S]*const collection = editorialMode\.value;[\s\S]*await api\.delete\(`\/items\/\$\{encodeURIComponent\(collection\)\}\/\$\{encodeURIComponent\(id\)\}`\);[\s\S]*clearVisualSelection\(\);[\s\S]*await loadEditorial\(\);/);
  assert.match(module, /确定删除“\$\{label\}”草稿吗？删除后无法恢复。/);
});

test('page link validation preserves same-page anchor links used by the PSD navigation', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /href\.startsWith\('#'\)/);
});

test('visual editing routes cross-collection selections through an explicit target resolver', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /resolveVisualEditingRecord/);
  assert.match(module, /activateVisualEditingTarget/);
  assert.match(module, /event\.data\.collection/);
  assert.match(module, /event\.data\.itemId/);
  assert.match(module, /selectEditorialRecord\(resolvedItemId, true\)/);
  assert.match(module, /selectServiceRecord\(resolvedItemId, true\)/);
  assert.match(module, /const resolvedItemId = resolved\.record\.id;/);
  assert.match(module, /selectPage\(resolvedItemId, true\)/);
  assert.match(module, /key: 'service-offices',[^}]*label: '国内直属办事处',[^}]*sectionKey: 'office-directory'/);
  assert.doesNotMatch(module, /key: 'service-offices',[^}]*action: 'locations'/);
  assert.match(module, /key: 'service-location-records',[^}]*label: '服务网点记录',[^}]*action: 'locations'/);
  assert.match(module, /entry\.action === 'locations'/);
  assert.match(module, /selectServiceMode\('service_locations'/);
  assert.match(module, /key: 'service-resource-records',[^}]*label: '服务资料与视频教学',[^}]*action: 'resources'/);
  assert.match(module, /entry\.action === 'resources'/);
  assert.match(module, /selectServiceMode\('service_resources'/);
  assert.match(module, /preserveLivePreviewSessionOnce/);
  assert.match(module, /if \(preserveLivePreviewSessionOnce\)/);
});

test('unresolved canvas edit requests cannot retain the previous record as a write target', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /if \(event\.data\?\.type === 'ruijun:cms-preview:edit-request' \|\| event\.data\?\.type === 'ruijun:cms-preview:edit-commit'\) \{\s*const resolved = activateVisualEditingTarget\(event\.data\);\s*if \(!resolved\) return;\s*selectedVisualElement\.value =/);
});

test('switching a preview record clears stale visual selection state', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /watch\(livePreviewIdentity, \(identity, previousIdentity\) => \{[\s\S]*if \(preserveLivePreviewSessionOnce\)[\s\S]*return;[\s\S]*selectedVisualElement\.value = null;[\s\S]*visualMediaSelection\.value = '';/);
});

test('live preview provides a compact record switcher when the active collection has multiple records', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /v-if="visualRecordChoices\.length > 1"/);
  assert.match(module, /aria-label="切换预览条目"/);
  assert.match(module, /v-for="choice in visualRecordChoices"/);
  assert.match(module, /@change="handleVisualPreviewRecordChange\(\$event\)"/);
  assert.match(module, /const visualRecordChoices = computed\(/);
  assert.match(module, /function handleVisualPreviewRecordChange\(event\) \{[\s\S]*switchVisualPreviewRecord\(event\.target\.value\);[\s\S]*event\.target\.value = String\(websitePreviewTarget\.value\?\.record\?\.id \|\| ''\);/);
  assert.match(module, /function switchVisualPreviewRecord\(itemId\) \{[\s\S]*clearVisualSelection\(\);[\s\S]*activateVisualEditingTarget\([\s\S]*return true;/);
});

test('cross-collection visual entries retain their page section context for preview navigation', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /if \(entry\.action === 'milestones' \|\| entry\.action === 'qualifications'\) \{\s*activePageSectionKey\.value = entry\.sectionKey \|\| '';/);
  assert.match(module, /function websitePreviewContextFor\(target, requestedSectionKey = activePageSectionKey\.value\) \{[\s\S]*if \(target\?\.collection !== 'pages'\) return requestedSectionKey \? \{ sectionKey: requestedSectionKey \} : \{\};/);
  assert.match(module, /const websitePreviewContext = computed\(\(\) => websitePreviewContextFor\(websitePreviewTarget\.value\)\);/);
});

test('article visual preview can use an authorized list-card canvas without changing the public route', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /v-if="websitePreviewTarget\?\.collection === 'articles'"[\s\S]*aria-label="新闻画布"/);
  assert.match(module, /<option value="detail">详情画布<\/option>/);
  assert.match(module, /<option value="list">列表卡片画布<\/option>/);
  assert.match(module, /const articlePreviewSurface = ref\('detail'\);/);
  assert.match(module, /function articlePreviewSectionKey\(target\) \{[\s\S]*dynamic-news[\s\S]*video-sharing/);
  assert.match(module, /function switchArticlePreviewSurface\(value\) \{/);
});

test('switching a site section clears the previous canvas selection before selecting another target', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /function clearVisualSelection\(\) \{\s*selectedVisualElement\.value = null;\s*visualMediaSelection\.value = '';\s*\}/);
  assert.match(module, /function openSiteAreaEntry\(entry\) \{\s*if \(!confirmDiscardChanges\('切换官网内容模块'\)\) return;\s*clearVisualSelection\(\);/);
  assert.match(module, /function selectSiteArea\(area\) \{[\s\S]*activePageSectionKey\.value = '';\s*clearVisualSelection\(\);/);
});

test('closing the live preview clears stale canvas selection state', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /function toggleLiveWebsitePreview\(\) \{\s*if \(liveWebsitePreviewVisible\.value\) \{\s*livePreviewRequestSequence \+= 1;\s*clearVisualSelection\(\);\s*liveWebsitePreviewVisible\.value = false;/);
});

test('site-area cards reload the page list once instead of silently ignoring a missing in-memory page', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /let page = pages\.value\.find\(\(record\) => record\.slug === siteArea\.value\);\s*if \(!page\) \{\s*await loadPages\(\);\s*page = pages\.value\.find\(\(record\) => record\.slug === siteArea\.value\);\s*\}/);
  assert.match(module, /if \(!page\) \{\s*error\.value = `未找到“\$\{siteAreaLabel\.value\}”对应的页面草稿，请重新加载后再试。`;\s*return;\s*\}/);
});

test('service location editing reads the nested contact object that its form saves', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /service_locations:\s*\[[^\]]*'contact'[^\]]*\]/);
  assert.match(module, /payload = \{ region:[\s\S]*contact,[\s\S]*business_status:/);
});

test('desktop workbench content keeps a safety gap from its fixed CMS navigation', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /html\.ruijun-workbench-active \.editor-page:not\(\.live-website-preview-active\) > section:not\(\.editor-guide\),[\s\S]*margin-left: 16px;/);
  assert.match(module, /html\.ruijun-workbench-active \.editor-page:not\(\.live-website-preview-active\) > \.empty[\s\S]*margin-left: 16px;/);
});

test('draft preview stays in the workbench flow instead of covering the editor', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /<section v-if="previewOpen" class="preview-panel" role="region" aria-labelledby="draft-preview-title">/);
  assert.doesNotMatch(module, /class="preview-backdrop"/);
  assert.doesNotMatch(module, /aria-modal="true" aria-labelledby="draft-preview-title"/);
  assert.match(module, /\.editor-page\s*>\s*\.preview-panel\s*\{[\s\S]*grid-column:\s*2[\s\S]*position:\s*relative/);
});

test('medium desktop live preview keeps form actions in a separate row instead of hiding the form', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /@media\(min-width:1280px\) and \(max-width:1599px\)\{[\s\S]*\.editor-page\.live-website-preview-active\{[\s\S]*grid-template-columns:176px minmax\(0,1fr\);[\s\S]*\.live-website-preview\{position:relative!important;[\s\S]*grid-column:2;grid-row:5/);
  assert.doesNotMatch(module, /@media\(min-width:1280px\) and \(max-width:1599px\)\{[\s\S]*\.editor-page\.live-website-preview-active>section:not\(\.editor-guide\),[\s\S]*display:none!important/);
});

test('mobile and narrow workbench canvases remain preview-only and explicitly disable visual editing state', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /function setVisualDevice\(device\) \{[\s\S]*?if \(device !== 'desktop'\) \{[\s\S]*?visualEditMode\.value = false;[\s\S]*?clearVisualSelection\(\);[\s\S]*?\}[\s\S]*?postLivePreviewUpdate\(\);/);
  assert.match(module, /const visualCanvasEditable = computed\(\(\) => canEditVisualCanvas\(\{ device: visualDevice\.value, viewportWidth: visualViewportWidth\.value \}\)\);/);
  assert.match(module, /function postLivePreviewUpdate\(forcedTarget = null\) \{[\s\S]*?const previewEditMode = visualCanvasEditable\.value && visualEditMode\.value;[\s\S]*?editMode: previewEditMode,/);
  assert.match(module, /function handleVisualViewportResize\(\) \{[\s\S]*?if \(!visualCanvasEditable\.value\) \{[\s\S]*?visualEditMode\.value = false;[\s\S]*?clearVisualSelection\(\);/);
  assert.match(module, /:disabled="!visualCanvasEditable"[^>]*@click="visualTool = 'select'"/);
  assert.match(module, /:disabled="!visualCanvasEditable"[^>]*@click="toggleVisualEditMode"/);
});

test('homepage hero uses a dedicated governed video selector instead of the disconnected generic media list', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /from '\.\/homepage-hero-video\.js'/);
  assert.match(module, /v-if="isHomeHeroSection\(section\)" class="home-hero-video-editor"/);
  assert.match(module, /aria-label="首页首屏视频"/);
  assert.match(module, /@change="setHomeHeroVideo\(section, \$event\.target\.value\)"/);
  assert.match(module, /v-for="asset in homeHeroVideoOptionsForSection\(section\)"/);
});

test('qualification media editor offers governed internal-preview drafts and materializes them for the canvas', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /function qualificationMediaAssets\(\) \{/);
  assert.match(module, /filterPreviewStagingMediaAssets\(mediaCandidates\.value, \{ scope: 'qualification', placementKey: 'qualification\.image', elementType: 'image' \}\)/);
  assert.match(module, /<option value="">选择已上传资质素材<\/option>[\s\S]*v-for="asset in qualificationMediaAssets\(\)"/);
  assert.match(module, /companyMode\.value === 'qualifications'[\s\S]*previewMediaAsset\(reference\.media_asset_id\)/);
  assert.match(module, /function addCompanyMediaReference\(\) \{[\s\S]*isCompanyMediaSelectable/);
});

test('workbench uploads create explicitly unpublished draft media assets', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  const start = module.indexOf('async function createMediaCandidate()');
  assert.ok(start >= 0, 'createMediaCandidate must remain available for media uploads');
  const end = module.indexOf('\nfunction nextDraftSlug(', start);
  assert.ok(end > start, 'createMediaCandidate must have a bounded function body');
  const body = module.slice(start, end);

  assert.match(body, /await api\.post\('\/files', form\)/);
  assert.match(body, /await api\.post\('\/items\/media_assets', \{[\s\S]*?status: 'draft',[\s\S]*?publication_state: 'unpublished',[\s\S]*?\}\);/);
});

test('successful saves renew the live preview authorization for the current target', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /async function renewLivePreviewAfterSuccessfulSave\(\) \{[\s\S]*liveWebsitePreviewVisible\.value[\s\S]*websitePreviewTarget\.value\?\.record\?\.id[\s\S]*startLiveWebsitePreview\(\);/);
  assert.match(module, /let livePreviewRootTarget = null;/);
  assert.match(module, /async function startLiveWebsitePreview\(\{ automatic = false, targetOverride = null, preserveRoot = false \} = \{\}\)/);
  assert.match(module, /const target = targetOverride \|\| \(automatic && livePreviewRootTarget \? livePreviewRootTarget : websitePreviewTarget\.value\);/);
  assert.match(module, /if \(!preserveRoot\) livePreviewRootTarget = \{ \.\.\.targetSnapshot, context: clone\(contextSnapshot\) \};/);
  assert.match(module, /async function renewLivePreviewAfterSuccessfulSave\(\) \{[\s\S]*livePreviewRootTarget[\s\S]*targetOverride: livePreviewRootTarget, preserveRoot: true/);
  const saveFunctions = [
    'savePage',
    'saveRepairPage',
    'saveSeries',
    'saveCompanyRecord',
    'saveServiceRecord',
    'saveKnowledge',
    'saveEditorialRecord',
    'saveSettings',
    'saveVisualSiteSettings',
    'saveModel',
    'saveParameter',
    'saveVisualParameterGroup'
  ];
  for (const name of saveFunctions) {
    const start = module.indexOf(`async function ${name}(`);
    assert.ok(start >= 0, `${name} must remain an async save function`);
    const next = module.indexOf('\nasync function ', start + 1);
    const body = module.slice(start, next >= 0 ? next : module.length);
    assert.match(body, /await renewLivePreviewAfterSuccessfulSave\(\);/, `${name} must renew the live preview after success`);
  }
});

test('canvas media selections preserve the default-media flag and allow product covers to restore the website fallback', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /allowDefaultMedia: event\.data\.allowDefaultMedia === true/);
  assert.match(module, /function canRestoreVisualMediaDefault\([\s\S]*collection === 'product_series' && path === 'cover_asset'/);
  assert.match(module, /selectedVisualCanRestoreDefault \? '沿用官网原图' : '选择媒体'/);
});

test('manual live-preview reconnect preserves the original page canvas after selecting a related record', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /@click="reconnectLiveWebsitePreview"/);
  assert.match(module, /function reconnectLiveWebsitePreview\(\)[\s\S]*targetOverride: livePreviewRootTarget, preserveRoot: true/);
});

test('canvas page selection keeps the website-area navigation aligned with the selected page slug', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /function syncSiteAreaForPage\(page\) \{[\s\S]*const slug = String\(page\?\.slug \|\| ''\)\.trim\(\);[\s\S]*if \(Object\.hasOwn\(siteAreaLabels, slug\)\) siteArea\.value = slug;/);
  assert.match(module, /const resolved = resolveVisualEditingRecord\([\s\S]*if \(!resolved\) return null;[\s\S]*requiresVisualDraftSwitchConfirmation\([\s\S]*if \(collection === 'pages'\) syncSiteAreaForPage\(resolved\.record\);/);
});
