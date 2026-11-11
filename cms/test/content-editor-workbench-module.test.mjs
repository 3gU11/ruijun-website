import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

const readWorkbenchSource = async () => {
  // The workbench now spans the SFC, its extracted modules, and two stylesheets.
  // Assertions about behaviour or layout should not depend on which of those a
  // rule happens to live in.
  const parts = await Promise.all([
    readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8'),
    readFile(new URL('../extensions/content-editor-workbench/src/draft-shapes.js', import.meta.url), 'utf8'),
    readFile(new URL('../extensions/content-editor-workbench/src/content-navigation.js', import.meta.url), 'utf8'),
    readFile(new URL('../extensions/content-editor-workbench/src/media-placement-catalog.js', import.meta.url), 'utf8'),
    readFile(new URL('../extensions/content-editor-workbench/src/media-poster-editor.js', import.meta.url), 'utf8'),
    readFile(new URL('../extensions/content-editor-workbench/src/module.css', import.meta.url), 'utf8'),
    readFile(new URL('../extensions/content-editor-workbench/src/module-global.css', import.meta.url), 'utf8')
  ]);
  return parts.join('\n');
};


test('content editor workbench provides structured page and product edits through the current Directus session', async () => {
  const [manifestText, index, moduleSource, nativeBridge, scopedStyles, globalStyles, navigationSource, placementSource] = await Promise.all([
    readFile(new URL('extensions/content-editor-workbench/package.json', root), 'utf8'),
    readFile(new URL('extensions/content-editor-workbench/src/index.js', root), 'utf8'),
    readFile(new URL('extensions/content-editor-workbench/src/module.vue', root), 'utf8'),
    readFile(new URL('extensions/content-editor-workbench/src/native-live-preview-bridge.js', root), 'utf8'),
    readFile(new URL('extensions/content-editor-workbench/src/module.css', root), 'utf8'),
    readFile(new URL('extensions/content-editor-workbench/src/module-global.css', root), 'utf8'),
    readFile(new URL('extensions/content-editor-workbench/src/content-navigation.js', root), 'utf8'),
    readFile(new URL('extensions/content-editor-workbench/src/media-placement-catalog.js', root), 'utf8')
  ]);
  // The workbench's source spans the SFC plus its extracted stylesheets and data
  // catalogs; this test asserts what the extension provides, not which file holds it.
  const module = [moduleSource, scopedStyles, globalStyles, navigationSource, placementSource].join('\n');
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
  assert.match(nativeBridge, /articles: \['id', 'slug', 'category', 'title', 'summary', 'body', 'body_media', 'transcript', 'display_date', 'sort_order'/);
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
  assert.match(module, /上传媒体素材/);
  assert.match(module, /上传并发布素材/);
  assert.match(module, /deleteMediaAsset\(asset\)/);
  assert.match(module, /api\.post\('\/media-poster\/asset\/delete'/);
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
  assert.match(module, /const mediaSlot = selectedVisualElement\.value\?\.mediaSlot \|\| '';[\s\S]*if \(!applyVisualMediaReplacement\(target, path, assetId, \{ mediaSlot, allowEmpty: canRestoreDefault \}\)\) \{ error\.value = '[^']*'; return; \}\s+if \(upgradingLegacyVideo\) target\.video_url = '';\s+recordVisualHistory\(\);/);
  assert.match(module, /\['left', 'center', 'right'\]\.includes\(normalizedMode\)/);
  assert.match(module, /setVisualAlignment\(target, path, normalizedMode\)/);
  assert.match(module, /positionFieldPath/);
  assert.match(module, /sectionKey: selectedVisualElement\.value\.sectionKey/);
  assert.match(module, /command: 'align',[\s\S]*fieldPath: selectedVisualElement\.value\.fieldPath/);
  assert.match(module, /copyright_status/);
  assert.match(module, /poster_asset_id: mediaDraft\.value\.poster_asset_id/);
  assert.match(module, /transcriptRequired/);
  assert.match(module, /eligibleEditorialMediaAssets/);
  assert.match(module, /动态新闻使用文章和图片；视频分享请在“视频分享内容”里单独维护/);
  assert.match(module, /视频分享素材不符合“文章与资讯 \/ 视频分享列表 \/ news \/ video-sharing”的使用范围/);
  assert.match(module, /未填写时官网先显示视频首帧/);
  assert.match(module, /posterRecommended: false/);
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
  // The everyday loaders are rebuilt per attempt: load() retries once after the
  // initial failure, and a pre-built array of promises cannot be awaited twice.
  assert.match(module, /const everyday = \(\) => \[loadPages\(\), loadHomepageSections\(\), loadSeries\(\), loadCompany\(\), loadEditorial\(\), loadMediaAssets\(\), loadMediaCandidates\(\)\];/);
  assert.match(module, /const technical = \(\) =>/);
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
  assert.match(module, /const detail = normalizeSeriesDetail\(seriesDraft\.value\.detail\);/);
  assert.match(module, /presentation: Object\.keys\(presentation\)\.length \? presentation : null/);
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
  const module = await readWorkbenchSource();

  assert.match(module, /function pageDisplayName\(page\) \{[\s\S]*if \(slug === 'home'\) return '网站主页';/);
  assert.match(module, /\{\{ pageDisplayName\(page\) \}\}/);
  assert.match(module, /\{\{ pageDisplayName\(pageDraft\) \}\}/);
  assert.match(module, /page: pageDisplayName\(pageDraft\.value\)/);
  assert.match(module, /if \(collection === 'pages'\) return pageDisplayName\(record\);/);
});

test('about hero media editor exposes the shared backdrop role used by the website', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /<option value="backdrop">首屏共享背景<\/option>/);
  assert.match(module, /<option value="background">首屏背景图层<\/option>/);
  assert.match(module, /<option value="foreground">首屏机器前景<\/option>/);
});

test('about hero canvas media uses independent governed placements for the background and machine foreground', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /slug === 'about' && element\.mediaRole === 'foreground' \? 'about\.hero\.foreground'/);
  assert.match(module, /slug === 'about' \? 'about\.hero\.background'/);
  assert.match(module, /\{ key: 'about\.hero\.background', label: '关于瑞钧首屏背景', mediaType: 'image', minWidth: 1920, minHeight: 900/);
  assert.match(module, /\{ key: 'about\.hero\.foreground', label: '关于瑞钧首屏机器图', mediaType: 'image', minWidth: 800, minHeight: 600/);
});

test('product-series cover selections use the governed product gallery placement', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /if \(collection === 'product_series' && String\(element\.mediaRole \|\| ''\)\.trim\(\) === 'cover'\) \{[\s\S]*placementKey: 'product\.gallery\.image'/);
});

test('homepage shared timeline media uses the governed about-timeline placements', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /'history': \(slug === 'home' \|\| slug === 'about'\) \? \(element\.mediaRole === 'icon' \? 'about\.timeline\.icon' : 'about\.timeline\.background'\)/);
  assert.match(module, /pageKey: slug === 'home' && String\(element\.sectionKey \|\| ''\)\.trim\(\) === 'history' \? '' : slug/);
});

test('service office region images and maps use distinct governed placements', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /'office-directory': element\.mediaRole === 'map' \? 'service\.office\.map' : 'service\.office\.image'/);
});

test('manufacturing PSD page layers use their own governed media placement in form and canvas filters', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /manufacturing\.layer\.image.*制造页面 PSD 图层图片/);
  assert.match(module, /'precision-machining': 'manufacturing\.layer\.image'/);
  assert.match(module, /'smart-warehouse': 'manufacturing\.layer\.image'/);
  assert.match(module, /pageKey: slug === 'home' && String\(element\.sectionKey \|\| ''\)\.trim\(\) === 'history' \? '' : slug,\s*sectionKey: String\(element\.sectionKey \|\| ''\)\.trim\(\)/);
});

test('video covers are optional on upload and can be supplied later from the media list', async () => {
  const module = await readWorkbenchSource();
  // 上传表单不再把封面设成必填，也不因未选封面而拦截。
  assert.doesNotMatch(module, /:required="Boolean\(selectedMediaPlacement\?\.posterRequired\)"/);
  assert.match(module, /暂不设置封面（之后可在素材清单补充）/);
  assert.match(module, /未设置时官网先显示视频首帧/);
  assert.match(module, /视频分享可选；教学视频和首屏说明建议填写/);
  // 已登记视频的封面补录：只改封面的端点 + 列表里的保存按钮。
  assert.match(module, /api\.post\('\/media-poster', \{ media_asset_id: id, poster_asset_id: posterId \|\| null \}\)/);
  assert.match(module, /async function saveMediaPoster\(asset\)/);
  assert.match(module, /封面尚未发布：官网暂用视频首帧，封面发布后自动生效。/);
});

test('canvas selection keeps the current product preview when Directus serializes its id as text', async () => {
  const module = await readWorkbenchSource();

  // Canvas postMessage payloads carry item IDs as strings, while Directus list
  // records may expose numeric IDs. A same-record selection must not clear the
  // active model and unmount the live preview iframe.
  assert.match(module, /const record = models\.value\.find\(\(item\) => String\(item\.id\) === String\(id\)\);/);
  assert.match(module, /if \(collection === 'product_models' && activeTab\.value === 'models' && String\(selectedModelId\.value\) === String\(resolvedItemId\) && modelDraft\.value\) \{[\s\S]*?return resolved;/);
});

test('ordinary product models do not expose workstation-only copy that their Nuxt canvas cannot render', async () => {
  const module = await readWorkbenchSource();

  assert.match(module, /const modelSupportsWorkstationIntro = computed\(\(\) => String\(modelDraft\.value\?\.series_code \|\| ''\)\.trim\(\) === 'workstation'\);/);
  assert.match(module, /<section v-if="modelSupportsWorkstationIntro" class="section-editor" aria-labelledby="model-intro-title">/);
  assert.match(module, /v-else class="read-only-note">当前型号在官网使用“型号导航与核心能力”模板，没有工作站介绍展示位。<\/p>/);
});

test('page section normalization materializes the controlled label field for canvas writes', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/draft-shapes.js', import.meta.url), 'utf8');
  assert.match(module, /kicker: typeof section\.kicker === 'string' \? section\.kicker : '',\s*label: typeof section\.label === 'string' \? section\.label : '',\s*title:/);
});

test('home page normalization materializes the controlled hero video field inside the persisted hero section', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /if \(record\.slug === 'home'\) \{\s*const hero = sections\.find\(\(section\) => String\(section\?\.id \|\| ''\) === 'hero'\);\s*if \(hero\) hero\.hero_video_asset_id = String\(hero\.hero_video_asset_id \|\| ''\);\s*\}/);
  assert.doesNotMatch(module, /normalized\.hero_video_asset_id/);
});

test('page saves compact unbound canvas media slots before writing sections to Directus', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /async function savePage\(\) \{[\s\S]*const persistedSections = normalizeSections\(pageDraft\.value\.sections\);[\s\S]*sections: persistedSections/);
});

test('visual property panel exposes bounded card sorting, duplication, and deletion', async () => {
  const module = await readWorkbenchSource();
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
  const module = await readWorkbenchSource();
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
  const module = await readWorkbenchSource();
  assert.match(module, /selectedVisualIsMedia && visualMediaReplacementOptions\.length/);
  assert.match(module, /isVisualMediaSelection/);
  assert.match(module, /草稿素材，仅当前内部预览/);
  assert.match(module, /filterPreviewStagingMediaAssets/);
  assert.match(module, /当前系统里没有同类型的已发布媒体/);
  assert.match(module, /待媒体/);
  assert.match(module, /getVisualMediaAssetId\(fieldTarget, fieldPath, \{ mediaSlot:/);
});

test('visual property panel preserves the preview-provided reason for a read-only target', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /readonlyReason: String\(event\.data\.readonlyReason \|\| '请先在媒体资产中导入并发布后再替换。'\)/);
});

test('core equipment canvas images use their fixed-card media placement instead of the full gallery rule', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /'core-equipment': element\.elementType === 'video' \? 'manufacturing\.gallery\.video' : 'manufacturing\.equipment\.image'/);
  assert.match(module, /\{ key: 'manufacturing\.equipment\.image', label: '生产核心设备卡图', mediaType: 'image', minWidth: 740, minHeight: 415/);
});

test('service hero canvas background uses its own governed media placement', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /slug === 'service' \? 'service\.hero\.image'/);
  assert.match(module, /\{ key: 'service\.hero\.image', label: '服务支持首屏背景', mediaType: 'image', minWidth: 1920, minHeight: 960/);
});

test('about timeline canvas background uses its own governed media placement', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /'history': \(slug === 'home' \|\| slug === 'about'\) \? \(element\.mediaRole === 'icon' \? 'about\.timeline\.icon' : 'about\.timeline\.background'\)/);
  assert.match(module, /\{ key: 'about\.timeline\.background', label: '关于页时间轴背景'/);
});

test('homepage reason canvas media uses section-specific governed placements', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /home\.reason\.machine/);
  assert.match(module, /home\.reason\.background/);
  assert.match(module, /items\/homepage_sections\?fields=/);
  assert.match(module, /homepageSections: homepageSections\.value/);
  assert.match(module, /homepage_sections: saveHomepageSection/);
  assert.match(module, /handlers\[selectedVisualRecord\.value\?\.collection\] \|\| handlers\[activeTab\.value\]/);
});

test('media upload form exposes every currently supported homepage reason and service action placement', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /\{ key: 'home\.reason\.background', label: '首页三大特点背景', mediaType: 'image', minWidth: 1600, minHeight: 900/);
  assert.match(module, /\{ key: 'home\.reason\.icon', label: '首页横移图标', mediaType: 'image', minWidth: 80, minHeight: 96/);
  assert.match(module, /\{ key: 'home\.reason\.machine', label: '首页三大特点设备前景', mediaType: 'image', minWidth: 160, minHeight: 240/);
  assert.match(module, /\{ key: 'service\.action\.icon', label: '服务入口图标', mediaType: 'image', minWidth: 34, minHeight: 42/);
});

test('media upload form uses the same minimum source dimensions as governance for about galleries and qualifications', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /\{ key: 'qualification\.image', label: '证书或资质图片', mediaType: 'image', minWidth: 365, minHeight: 410/);
  assert.match(module, /\{ key: 'about\.gallery\.image', label: '关于页厂区图库', mediaType: 'image', minWidth: 792, minHeight: 446/);
  assert.match(module, /\{ key: 'about\.client\.image', label: '关于页客户图片', mediaType: 'image', minWidth: 542, minHeight: 406/);
});

test('media upload placement selection pre-fills an explicit video-sharing context instead of splitting the placement key', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /@change="applyMediaPlacementContext\(mediaDraft\.placement_key, true\)"/);
  assert.match(module, /'news\.video_share\.list': \{ pageKey: 'news', sectionKey: 'video-sharing' \}/);
  assert.match(module, /function applyMediaPlacementContext\(placementKey, force = false\) \{/);
  assert.doesNotMatch(module, /const \[pageKey, sectionKey\] = mediaDraft\.value\.placement_key\.split\('\.'\);/);
});

test('page drafts can attach matching private preview media without presenting it as publicly selectable', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /function pageMediaOptions\(scope\)/);
  assert.match(module, /filterPreviewStagingMediaAssets\(mediaCandidates\.value, \{ scope \}\)/);
  // The candidate list is injected: draft-shapes.js is pure and cannot reach
  // the workbench's live media list on its own.
  assert.match(module, /isPageMediaOptionForSection\(assetId, scope, section, candidates\)/);
  assert.match(module, /export function isPageMediaOptionForSection\(assetId, scope, section, options = \[\]\)/);
  assert.match(module, /草稿素材，仅当前内部预览/);
  assert.match(module, /内部预览草稿/);
});

test('empty page media slots are shown as website defaults rather than unverified asset references', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /function pageMediaLabel\(reference\) \{[\s\S]*if \(!String\(reference\.media_asset_id \?\? ''\)\.trim\(\)\) return '沿用官网默认图案';/);
  assert.match(module, /当前引用 \$\{reference\.media_asset_id\}（尚未通过此选择器验证）/);
});

test('media selectors prefer the CMS asset title so same-named files remain distinguishable', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /function mediaAssetLabel\(asset\) \{\s*const title = String\(asset\?\.title \|\| ''\)\.trim\(\);\s*const filename = String\(asset\?\.original_file_name \|\| `素材 \$\{asset\?\.id \|\| ''\}`\)\.trim\(\);\s*return `\$\{title \|\| filename\} · \$\{filename\} · \$\{asset\?\.mime_type \|\| '未知类型'\}`;/);
});

test('product drawing draft media is resolved into the live canvas record before the iframe receives it', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /const drawingMedia = previewMediaAsset\(drawing\?\.media_asset_id\)/);
  assert.match(module, /configuration\.drawings = parseArray\(configuration\.drawings\)\.map\(\(drawing\) => \{[\s\S]*return drawingMedia \? \{ \.\.\.drawing, \.\.\.drawingMedia \} : drawing;/);
});

test('product download resources can select an uploaded document asset instead of requiring a hand-written URL', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /产品附件<select v-model="resource\.media_asset_id"/);
  assert.match(module, /function productResourceMediaAssets\(\)[\s\S]*filterPreviewStagingMediaAssets/);
  assert.match(module, /resources: parseArray\(record\.resources\)\.map\(\(item\) => \(\{ title: String\(item\?\.title \|\| ''\), type: String\(item\?\.type \|\| ''\), url: String\(item\?\.url \|\| item\?\.path \|\| ''\), media_asset_id: String\(item\?\.media_asset_id \|\| ''\) \}\)\)/);
  assert.match(module, /media_asset_id: item\.media_asset_id \|\| null/);
});

test('service resource downloads can select an uploaded service document draft for internal preview', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /受控下载文件[\s\S]*<select v-model="serviceDraft\.asset"[\s\S]*serviceResourceMediaAssets\(serviceDraft\.type\)/);
  assert.match(module, /function serviceResourceMediaAssets\(type = serviceDraft\.value\?\.type\)/);
  assert.match(module, /function serviceResourceMediaAssetLabel\(asset, type = serviceDraft\.value\?\.type\)/);
  assert.match(module, /仅内部预览下载/);
});

test('service resources select only their governed video or document draft candidates', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /function serviceResourceMediaPlacement\(type\)[\s\S]*service\.tutorial\.video[\s\S]*service\.document/);
  assert.match(module, /function serviceResourceMediaAssets\(type = serviceDraft\.value\?\.type\)[\s\S]*elementType: isVideo \? 'video' : ''/);
  assert.match(module, /serviceResourceMediaAssets\(serviceDraft\.type\)/);
  assert.match(module, /serviceResourceMediaAssetLabel\(asset, serviceDraft\.type\)/);
});

test('service tutorial covers use their own governed poster placement, including matching internal-preview drafts', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /service\.tutorial\.poster/);
  assert.match(module, /function serviceTutorialPosterAssets\(\)[\s\S]*editableMediaAssetsForPlacement\('service', 'service\.tutorial\.poster', 'image'\)/);
  assert.match(module, /serviceDraft\.cover_asset && !isServiceTutorialPosterAsset\(serviceDraft\.cover_asset\)/);
  assert.match(module, /v-for="asset in serviceTutorialPosterAssets\(\)"/);
  assert.match(module, /serviceTutorialPosterAssetLabel\(asset\)/);
});

test('service resource live previews materialize the selected document and cover through the protected media proxy', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /collection === 'service_resources'[\s\S]*const asset = previewMediaAsset\(record\.asset\?\.media_asset_id \|\| record\.asset\)/);
  assert.match(module, /const coverAsset = previewMediaAsset\(record\.cover_asset\?\.media_asset_id \|\| record\.cover_asset\)/);
  assert.match(module, /record\.asset_media_asset_id = asset\.media_asset_id;/);
  assert.match(module, /record\.cover_media_asset_id = coverAsset\.media_asset_id;/);
  assert.match(module, /service_resources: \['id',[\s\S]*'asset_media_asset_id', 'cover_media_asset_id'/);
});

test('draft media sent from the workbench to Nuxt uses the private preview-media proxy instead of a Directus asset URL', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /path: `\/api\/preview\/media\/\$\{encodeURIComponent\(String\(asset\.id\)\)\}`/);
  assert.match(module, /posterPath: `\/api\/preview\/media\/\$\{encodeURIComponent\(String\(poster\.id\)\)\}`/);
  assert.doesNotMatch(module, /path: `\$\{window\.location\.origin\}\/assets\/\$\{encodeURIComponent\(asset\.file_id\)\}`/);
});

test('opening the visual property panel reserves canvas width instead of covering it', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /:class="\{ 'visual-property-panel-open': selectedVisualElement \}"/);
  assert.match(module, /--visual-property-panel-width:clamp\(200px,34%,300px\)/);
  assert.match(module, /\.live-website-preview\.visual-property-panel-open \.visual-canvas-viewport\{right:var\(--visual-property-panel-width\)\}/);
  assert.match(module, /\.visual-property-panel\{[^}]*width:var\(--visual-property-panel-width\)/);
});

test('published series, models and parameters cannot be deleted from the canvas', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /function canDeleteContent\(record\) \{/);
  assert.match(module, /editableStatuses\.has\(record\.status\) && record\.publication_state !== 'published'/);
  assert.match(module, /if \(!canDeleteContent\(record\)\) \{\s*error\.value = '已发布或审核中的系列不能直接删除/);
  assert.match(module, /if \(!canDeleteContent\(record\)\) \{\s*error\.value = '已发布或审核中的机型不能直接删除/);
  assert.match(module, /if \(!canDeleteContent\(record\)\) \{\s*error\.value = '已发布或审核中的参数不能直接删除/);
  // Deleting a draft card cascades into its draft models and parameters, but
  // never into published children.
  assert.match(module, /const undeletableModels = childModels\.filter\(\(model\) => !canDeleteContent\(model\)\)/);
  assert.match(module, /该系列下有 \$\{undeletableModels\.length\} 台已发布或审核中的机型/);
  assert.match(module, /确认删除系列「\$\{record\.name \|\| record\.series_code\}」\$\{cascadeNote\}/);
});

test('selecting a series on the canvas keeps both sides in sync and renaming cascades to models', async () => {
  const module = await readWorkbenchSource();
  // Left-list selection / new-card creation must switch the iframe card too,
  // otherwise "＋新增机型" keeps writing the previous `activeSeriesCode`.
  assert.match(module, /kind: 'series-selected'/);
  assert.match(module, /function notifyCanvasSeriesSelection\(record\)/);
  assert.match(module, /selectSeries\(resolvedItemId, true, false\)/);
  // A series rename is denormalized onto each model; save it explicitly.
  assert.match(module, /const renamedModels = previousCode && previousCode !== nextCode/);
  assert.match(module, /await api\.patch\(`\/items\/product_models\/\$\{encodeURIComponent\(model\.id\)\}`, \{ series_code: nextCode \}\)/);
  assert.match(module, /同步更新 \$\{renamedModels\.length\} 个机型的所属系列编码/);
});

test('new series dialog suggests an editable series code and validates it', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /function suggestedSeriesCode\(name\)/);
  assert.match(module, /function availableSeriesCode\(base\)/);
  assert.match(module, /const seriesCodeTouched = ref\(false\)/);
  assert.match(module, /@input="seriesCodeTouched = true"/);
  assert.match(module, /系列编码只能使用小写字母、数字和连字符/);
  assert.match(module, /系列编码「\$\{code\}」已被其他系列使用/);
});

test('the top save button flushes edited parameter rows instead of dropping them', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /const dirtyParameterIds = ref\(\[\]\)/);
  assert.match(module, /async function persistDirtyParameters\(\)/);
  assert.match(module, /@input="markParameterDirty\(parameter\)"/);
  assert.match(module, /const parameterResult = await persistDirtyParameters\(\)/);
  // Saving one row must not reload the whole table and discard other edits.
  assert.match(module, /Do not reload the whole table: it would discard edits in the other rows/);
});

test('post-save list and preview failures do not overwrite a successful PATCH', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /async function refreshAfterSave\(loaders = \[\]\)/);
  assert.match(module, /列表刷新失败，请重新加载页面查看/);
  // A homepage-section save used to send controlled workflow fields and throw
  // when the readback reload failed even though the PATCH had succeeded.
  const moduleVue = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.doesNotMatch(moduleVue, /status: record\.status,\s*publication_state: record\.publication_state/);
  assert.doesNotMatch(moduleVue, /if \(!persisted\) throw new Error\('保存后未能回读首页区块'\)/);
});

test('a series or page edited while the save request is in flight stays dirty', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /JSON\.stringify\(pageDraft\.value\) !== pageBefore/);
  assert.match(module, /JSON\.stringify\(seriesDraft\.value\) !== seriesBefore/);
  assert.match(module, /JSON\.stringify\(modelDraft\.value\) !== modelBefore/);
});

test('submission batches are one queue row and keep legacy records visible', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /collection: 'content_submissions', label: '送审批次'/);
  assert.match(module, /function hideBatchedMembers\(records\)/);
  assert.match(module, /reviewQueue\.value = hideBatchedMembers\(await loadContentQueue\('review'\)\)/);
  assert.match(module, /submissionQueue\.value = hideBatchedMembers\(await loadContentQueue/);
  // Batch actions tolerate one bad member instead of aborting the whole loop.
  assert.match(module, /批次未提交：/);
  assert.match(module, /批次未完成审核：/);
});

test('approving product content points the reviewer at product release', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /const productReleaseHint = ref\(false\)/);
  assert.match(module, /产品内容已批准进入待发布/);
  assert.match(module, /href="\/admin\/ruijun-product-release-workbench"/);
  assert.match(module, /hasProductItem/);
});

test('typing in the editor form does not drift the shared scroll container', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /@input\.capture="guardEditorInput"/);
  assert.match(module, /@focusin\.capture="guardEditorFocus"/);
  assert.match(module, /@pointerdown\.capture="captureEditorPointer"/);
  assert.match(module, /@wheel\.capture="markEditorUserScroll"/);
  assert.match(module, /function guardEditorInput\(event\)/);
  assert.match(module, /delta > 0 && delta <= 160/);
});

test('clicking a model chip switches the form without reloading the canvas', async () => {
  const module = await readWorkbenchSource();
  // The series preview token already authorizes the related model drafts; the
  // chip click must keep that session instead of re-issuing a token (which
  // reloads the iframe and loses the open detail panel).
  assert.match(module, /async function focusCanvasModel[\s\S]*?preserveLivePreviewSessionOnce = Boolean\([\s\S]*?websitePreviewTarget\.value\.collection\) !== 'product_models'/);
  // A template-only chip is not a CMS record; selecting it must not create one.
  assert.match(module, /该机型是官网原版名称，尚未建立 CMS 记录；请点画布上的「＋新增机型」建立后再编辑。/);
  assert.doesNotMatch(module, /已为「\$\{code\}」建立机型草稿记录/);
  // Opening a series card must also keep the iframe; the page opens the panel.
  const focusSeries = module.match(/async function focusCanvasSeries[\s\S]*?\n\}/)?.[0] || '';
  assert.ok(focusSeries);
  assert.doesNotMatch(focusSeries, /startLiveWebsitePreview/);
});

test('product detail canvases use a long page and keep the zoom when the property panel opens', async () => {
  const module = await readWorkbenchSource();
  // The series panel starts below the 1080px fold, so product canvases need a
  // long artboard and width-only fitting.
  assert.match(module, /const productDetailCanvas = computed\(\(\) => \['product_series', 'product_models'\]/);
  assert.match(module, /return '2800px';/);
  assert.match(module, /const longPage = parseInt\(visualCanvasHeight\.value\) > 1400;/);
  assert.match(module, /visualZoom\.value = Math\.max\(0\.05, Math\.min\(1, longPage \? widthFit/);
  // Selecting a field must not shrink the canvas to ~16% when the panel opens.
  assert.match(module, /if \(selectedVisualElement\.value && !force\) return;/);
  assert.match(module, /new ResizeObserver\(\(\) => fitVisualCanvas\(\)\)/);
});

test('the visual editor toolbar uses stable rows inside the bounded preview column', async () => {
  const module = await readWorkbenchSource();
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
  const module = await readWorkbenchSource();
  assert.match(module, /grid-template-columns:220px minmax\(0,1fr\) clamp\(460px,38vw,920px\)/);
  assert.match(module, /grid-template-columns: 222px minmax\(0, 1fr\) clamp\(460px, 38vw, 920px\)/);
  assert.doesNotMatch(module, /grid-template-columns:220px minmax\(520px,1fr\) clamp\(720px,38vw,920px\)/);
  assert.match(module, /\.editor-page\.live-website-preview-active \.editor-form \.field-grid\{grid-template-columns:1fr\}/);
  assert.match(module, /--visual-property-panel-width:clamp\(200px,34%,300px\)/);
  assert.match(module, /html\.ruijun-workbench-active \.live-website-preview \.visual-canvas-viewport > iframe\{width:var\(--canvas-width\)!important\}/);
});

test('1440px visual editing keeps the form above an in-flow preview instead of squeezing it behind preview chrome', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /@media\(min-width:1280px\) and \(max-width:1599px\)\{[\s\S]*?grid-template-columns:176px minmax\(0,1fr\);[\s\S]*?\.live-website-preview\{position:relative!important;[\s\S]*?grid-column:2;grid-row:5/);
  assert.match(module, /@media\(min-width:1280px\) and \(max-width:1599px\)\{[\s\S]*?\.editor-page\.live-website-preview-active \.model-layout\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(module, /@media\(min-width:1600px\)\{[\s\S]*?grid-template-columns:222px minmax\(400px,\.85fr\) minmax\(640px,1\.15fr\)/);
});

test('medium desktop visual editing keeps the workbench menu in flow so it cannot cover canvas controls', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /@media\(min-width:901px\) and \(max-width:1279px\)\{[\s\S]*?\.editor-page\.live-website-preview-active>\.wp-admin-menu\{position:static!important;[\s\S]*?z-index:auto!important;[\s\S]*?grid-column:1!important/);
});

test('fixed desktop workbench navigation reserves the header and guide column before live preview opens', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /html\.ruijun-workbench-active \.editor-page:not\(\.live-website-preview-active\) \{[\s\S]*grid-template-columns: 238px minmax\(0, 1fr\);/);
  assert.match(module, /@media \(min-width: 901px\) \{[\s\S]*html\.ruijun-workbench-active \.editor-page:not\(\.live-website-preview-active\) > \.toolbar,[\s\S]*html\.ruijun-workbench-active \.editor-page:not\(\.live-website-preview-active\) > \.editor-guide,[\s\S]*html\.ruijun-workbench-active \.editor-page:not\(\.live-website-preview-active\) > \.message,[\s\S]*html\.ruijun-workbench-active \.editor-page:not\(\.live-website-preview-active\) > \.retry-save-action \{[\s\S]*grid-column: 2;[\s\S]*margin-left: 16px;/);
});

test('form edits enter the same visual history without duplicating undo snapshots', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /watch\(\(\) => currentDraftState\(\), \(next, previous\) => \{[\s\S]*recordVisualHistory\(\);[\s\S]*\}, \{ deep: true, flush: 'post' \}\)/);
  assert.match(module, /let suppressDraftHistory = false/);
  assert.match(module, /if \(suppressDraftHistory\) return/);
});

test('discarding visual changes immediately resynchronizes the live iframe', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /function discardVisualChanges\(\) \{[\s\S]*markDraftSaved\(\);[\s\S]*postLivePreviewUpdate\(\);[\s\S]*\}/);
});

test('visual draft save exposes a retry action without discarding the local draft', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /v-if="error && retrySaveAction"/);
  assert.match(module, /重新保存/);
  assert.match(module, /const retrySaveAction = ref\(null\)/);
  assert.match(module, /async function retrySave\(\)/);
  assert.match(module, /retrySaveAction\.value = saveVisualDraft/);
  assert.match(module, /async function saveVisualDraft\(\)/);
});

test('visual text property input syncs the live iframe before the field loses focus', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /<textarea[^>]+:value="selectedVisualFieldValue"[^>]+@input="commitVisualField\(\$event\.target\.value\)"/);
  assert.doesNotMatch(module, /<textarea[^>]+:value="selectedVisualFieldValue"[^>]+@change="commitVisualField/);
});

test('visual property edits explain rejected numeric or controlled-field input without discarding the current value', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /const normalizedValue = options\.length \? options\.find\(\(option\) => option\.value === value\)\?\.value : value;[\s\S]*if \(normalizedValue == null \|\| !setVisualFieldValue\(target, path, normalizedValue\)\) \{[\s\S]*error\.value = '请输入有效数值或符合字段格式的内容。';[\s\S]*return;[\s\S]*\}/);
  assert.match(module, /if \(error\.value === '请输入有效数值或符合字段格式的内容。'\) error\.value = '';/);
});

test('page visual edits resolve the active page draft instead of the stale page-list record', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /pages:\s*preferVisualDraftRecord\(pages\.value, pageDraft\.value\)/);
  assert.match(module, /resolveActiveVisualEditingTarget\(websitePreviewTarget\.value, resolved, selection\)/);
  assert.match(module, /resolveVisualFieldTarget\(selectedVisualRecord\.value\?\.record, selectedVisualElement\.value \|\| \{\}\)/);
});

test('switching elements on the same page canvas keeps unsaved page edits instead of reloading the saved record', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /if \(collection === 'pages' && activeTab\.value === 'pages' && String\(selectedPageId\.value\) === String\(resolvedItemId\) && pageDraft\.value\) \{\s*activePageSectionKey\.value = String\(selection\.sectionKey \|\| activePageSectionKey\.value \|\| ''\);\s*return resolved;\s*\}/);
  assert.match(module, /if \(collection === 'pages'\) \{\s*activeTab\.value = 'pages';\s*selectPage\(resolvedItemId, true\);/);
});

test('visual text property input supports text-bound command buttons', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /selectedVisualElement\.elementType === 'text' \|\| selectedVisualElement\.elementType === 'button'/);
});

test('article category is fixed to dynamic news in the canvas property panel', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /const selectedVisualFieldOptions = computed\(\(\) => \{[\s\S]*collection === 'articles'[\s\S]*fieldPath === 'category'[\s\S]*value: 'news'/);
  assert.doesNotMatch(module, /value: 'video', label: '视频分享'/);
  assert.match(module, /v-if="selectedVisualFieldOptions\.length" class="visual-property-field">内容类型<select[^>]+@change="commitVisualField\(\$event\.target\.value\)"/);
  assert.match(module, /v-else-if="selectedVisualElement\.fieldPath && \(selectedVisualElement\.elementType === 'text' \|\| selectedVisualElement\.elementType === 'button'\)" class="visual-property-field">文字内容<textarea/);
});

test('visual button properties expose and validate the explicitly bound destination link', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /selectedVisualElement\.elementType === 'button' && selectedVisualElement\.linkFieldPath/);
  assert.match(module, /aria-label="按钮链接"/);
  assert.match(module, /:value="selectedVisualLinkValue"/);
  assert.match(module, /@input="commitVisualLink\(\$event\.target\.value\)"/);
  assert.match(module, /function commitVisualLink\(value\)/);
  assert.match(module, /normalized && !isValidSiteLink\(normalized\)/);
  assert.match(module, /setVisualFieldValue\(selectedVisualTarget\.value, path, normalized\)/);
});

test('live preview sends a freshly built snapshot after an indirect nested visual edit', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /function buildLivePreviewRecord\(target = websitePreviewTarget\.value\)/);
  assert.match(module, /function postLivePreviewUpdate\(forcedTarget = null\) \{[\s\S]{0,600}const pageTarget = websitePreviewTarget\.value;[\s\S]{0,600}const selected = forcedTarget \|\| selectedVisualRecord\.value;[\s\S]{0,600}const target = selected && \(String\(selected\.collection\) !== String\(pageTarget\?\.collection \|\| ''\) \|\| selected\.record !== pageTarget\?\.record\) \? selected : pageTarget;[\s\S]{0,600}const preview = buildLivePreviewRecord\(target\);/);
  assert.match(module, /function queueLivePreviewUpdate\(target = null\) \{[\s\S]*const explicitTarget = target\?\.collection && target\?\.record \? target : null;[\s\S]*if \(explicitTarget\) pendingLivePreviewTarget = explicitTarget;[\s\S]*const updateTarget = pendingLivePreviewTarget \|\| explicitTarget;[\s\S]*pendingLivePreviewTarget = null;[\s\S]*postLivePreviewUpdate\(updateTarget\);/);
  assert.match(module, /function commitVisualField\(value\) \{[\s\S]*queueLivePreviewUpdate\(selectedVisualRecord\.value\);/);
  assert.match(module, /watch\(currentLivePreviewRecord, \(\) => queueLivePreviewUpdate\(\), \{ deep: true \}\)/);
  assert.doesNotMatch(module, /function postLivePreviewUpdate\(forcedTarget = null\) \{[\s\S]{0,220}const preview = currentLivePreviewRecord\.value;/);
});

test('visual text commit immediately posts the current page snapshot before reactive watchers can supersede its debounce', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /function commitVisualField\(value\) \{[\s\S]*recordVisualHistory\(\);[\s\S]*postLivePreviewUpdate\(selectedVisualRecord\.value\);/);
});

test('live preview materializes governed media for every supported record snapshot', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /import \{ materializeVisualMediaRecord \} from '\.\/visual-preview-media\.js';/);
  assert.match(module, /collection === 'articles'/);
  assert.match(module, /record\.media = normalizeMediaReferences\(record\.mediaReferences \|\| record\.media \|\| \[\]\)\.flatMap/);
  assert.match(module, /const media = previewMediaAsset\(reference\.media_asset_id\)/);
  assert.match(module, /return previewSafeRecord\(collection, materializeVisualMediaRecord\(record, previewMediaAsset\)\);/);
  assert.match(module, /posterPath: `\/api\/preview\/media\/\$\{encodeURIComponent\(String\(poster\.id\)\)\}`/);
  assert.match(module, /product_parameters: \['id', 'model_code', 'field_name', 'value', 'unit', 'presentation', 'sort_order', 'status', 'publication_state'\]/);
});

test('live preview resolves a persisted private draft asset after the candidate list finishes loading', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /const stagingAsset = mediaCandidates\.value\.find\(\(item\) => String\(item\.id\) === String\(assetId\) && isPreviewStagingMedia\(item\)\);/);
  assert.match(module, /const asset = previewableMediaAssets\.value\.find\(\(item\) => String\(item\.id\) === String\(assetId\)\) \|\| stagingAsset;/);
});

test('homepage visual preview sends a transient resolved URL while retaining the persisted video asset id', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /const hero = record\.sections\.find\(\(section\) => String\(section\?\.id \|\| ''\) === 'hero'\);/);
  assert.match(module, /hero\.hero_video_asset_url = heroVideo\.path;/);
});

test('video article media canvas inherits the governed news video placement', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /collection === 'articles'/);
  assert.match(module, /media\\\.\\d\+\\\.\(\?:path\|media_asset_id\)/);
  assert.match(module, /collection === 'articles' && articleMediaField[\s\S]*String\(element\.fieldPath \|\| ''\)\.trim\(\) === 'video_url'/);
  assert.match(module, /news\.video_share\.list/);
  assert.match(module, /pageKey: 'news'/);
  assert.match(module, /sectionKey: 'video-sharing'/);
});

test('live visual edits reach the iframe within the immediate-preview budget', async () => {
  const module = await readWorkbenchSource();
  const delay = Number(module.match(/postLivePreviewUpdate\(updateTarget\);[\s\S]{0,100}?\}, (\d+)\)/)?.[1]);
  assert.ok(Number.isFinite(delay), 'live preview debounce must be explicit');
  assert.ok(delay <= 100, `live preview debounce must be <= 100ms, received ${delay}ms`);
});

test('opening the visual preview enables canvas editing only when the current viewport allows it', async () => {
  const module = await readWorkbenchSource();
  const startPreview = module.match(/async function startLiveWebsitePreview\([^)]*\) \{([\s\S]*?)\n\}/)?.[1] || '';
  assert.match(startPreview, /liveWebsitePreviewVisible\.value = true/);
  assert.match(startPreview, /visualEditMode\.value = visualCanvasEditable\.value/);
});

test('reconnecting live preview cannot let a stale page token overwrite the current canvas target', async () => {
  const module = await readWorkbenchSource();
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
  const module = await readWorkbenchSource();
  const submitPreview = module.match(/function submitPreviewToken\([\s\S]*?\n\}/)?.[0] || '';
  assert.match(submitPreview, /document\.body\.append\(form\);\s*form\.submit\(\);/);
  assert.match(submitPreview, /window\.setTimeout\(\(\) => form\.remove\(\), 0\);/);
  assert.doesNotMatch(submitPreview, /form\.submit\(\);\s*form\.remove\(\);/);
});

test('visual preview is opt-in so it cannot cover the initial editing workflow', async () => {
  const module = await readWorkbenchSource();
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
  const module = await readWorkbenchSource();
  assert.match(module, /\.live-preview-error\{[^}]*pointer-events:none/);
});

test('article same-day order preserves an unset value instead of silently writing zero', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /function normalizeOptionalSortOrder\(value\)/);
  assert.match(module, /sort_order: normalizeOptionalSortOrder\(record\.sort_order\)/);
  assert.match(module, /<label>同日排序<input v-model\.number="editorialDraft\.sort_order"[^>]*placeholder="留空表示按系统默认顺序"/);
  assert.match(module, /const sortOrder = normalizeOptionalSortOrder\(editorialDraft\.value\.sort_order\);/);
  assert.match(module, /sort_order: sortOrder/);
});

test('editorial cleanup only exposes deletion for unpublished draft/rejected content and clears its canvas state', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /v-if="canDeleteEditorialDraft\(editorialDraft\)"[\s\S]*@click="deleteEditorialDraft"/);
  assert.match(module, /function canDeleteEditorialDraft\(record\) \{\s*const deletableStatuses = new Set\(\['draft', 'rejected', 'unpublished'\]\);\s*return Boolean\(record\?\.id\) && deletableStatuses\.has\(record\.status\) && record\.publication_state === 'unpublished';\s*\}/);
  assert.match(module, /async function deleteEditorialDraft\(\) \{[\s\S]*const collection = editorialMode\.value;[\s\S]*await api\.delete\(`\/items\/\$\{encodeURIComponent\(collection\)\}\/\$\{encodeURIComponent\(id\)\}`\);[\s\S]*clearVisualSelection\(\);[\s\S]*await loadEditorial\(\);/);
  assert.match(module, /确定删除“\$\{label\}”草稿吗？删除后无法恢复。/);
});

test('page link validation preserves same-page anchor links used by the PSD navigation', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /href\.startsWith\('#'\)/);
});

test('visual editing routes cross-collection selections through an explicit target resolver', async () => {
  const module = await readWorkbenchSource();
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
  const module = await readWorkbenchSource();
  assert.match(module, /if \(event\.data\?\.type === 'ruijun:cms-preview:edit-request' \|\| event\.data\?\.type === 'ruijun:cms-preview:edit-commit'\) \{\s*const resolved = activateVisualEditingTarget\(event\.data\);\s*if \(!resolved\) return;[\s\S]{0,900}?selectedVisualElement\.value =/);
  // A fallback-only product detail is seeded from the website original before the
  // first edit lands, so one typed field cannot wipe the rest of the copy.
  assert.match(module, /if \(needsSeed\) seedCanvasListDetail\(String\(resolved\.collection\), record\);/);
});

test('switching a preview record clears stale visual selection state', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /watch\(livePreviewIdentity, \(identity, previousIdentity\) => \{[\s\S]*if \(preserveLivePreviewSessionOnce\)[\s\S]*return;[\s\S]*selectedVisualElement\.value = null;[\s\S]*visualMediaSelection\.value = '';/);
});

test('live preview provides a compact record switcher when the active collection has multiple records', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /v-if="visualRecordChoices\.length > 1"/);
  assert.match(module, /aria-label="切换预览条目"/);
  assert.match(module, /v-for="choice in visualRecordChoices"/);
  assert.match(module, /@change="handleVisualPreviewRecordChange\(\$event\)"/);
  assert.match(module, /const visualRecordChoices = computed\(/);
  assert.match(module, /function handleVisualPreviewRecordChange\(event\) \{[\s\S]*switchVisualPreviewRecord\(event\.target\.value\);[\s\S]*event\.target\.value = String\(websitePreviewTarget\.value\?\.record\?\.id \|\| ''\);/);
  assert.match(module, /function switchVisualPreviewRecord\(itemId\) \{[\s\S]*clearVisualSelection\(\);[\s\S]*activateVisualEditingTarget\([\s\S]*return true;/);
});

test('cross-collection visual entries retain their page section context for preview navigation', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /if \(entry\.action === 'milestones' \|\| entry\.action === 'qualifications'\) \{\s*activePageSectionKey\.value = entry\.sectionKey \|\| '';/);
  assert.match(module, /function websitePreviewContextFor\(target, requestedSectionKey = activePageSectionKey\.value\) \{[\s\S]*if \(target\?\.collection !== 'pages'\) return requestedSectionKey \? \{ sectionKey: requestedSectionKey \} : \{\};/);
  assert.match(module, /const websitePreviewContext = computed\(\(\) => websitePreviewContextFor\(websitePreviewTarget\.value\)\);/);
});

test('article visual preview can use an authorized list-card canvas without changing the public route', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /v-if="websitePreviewTarget\?\.collection === 'articles'"[\s\S]*aria-label="新闻画布"/);
  assert.match(module, /<option value="detail">详情画布<\/option>/);
  assert.match(module, /<option value="list">列表卡片画布<\/option>/);
  assert.match(module, /const articlePreviewSurface = ref\('detail'\);/);
  assert.match(module, /function articlePreviewSectionKey\(target\) \{[\s\S]*dynamic-news[\s\S]*video-sharing/);
  assert.match(module, /function switchArticlePreviewSurface\(value\) \{/);
});

test('switching a site section clears the previous canvas selection before selecting another target', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /function clearVisualSelection\(\) \{\s*selectedVisualElement\.value = null;\s*visualMediaSelection\.value = '';\s*\}/);
  assert.match(module, /function openSiteAreaEntry\(entry\) \{[\s\S]*?const keepsDraft = productSections\.has\(String\(entry\.action\)\) && productSections\.has\(String\(activeTab\.value\)\);[\s\S]*?if \(!keepsDraft && !confirmDiscardChanges\('切换官网内容模块'\)\) return;\s*clearVisualSelection\(\);/);
  assert.match(module, /function selectSiteArea\(area\) \{[\s\S]*activePageSectionKey\.value = '';\s*clearVisualSelection\(\);/);
});

test('closing the live preview clears stale canvas selection state', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /function toggleLiveWebsitePreview\(\) \{\s*if \(liveWebsitePreviewVisible\.value\) \{\s*livePreviewRequestSequence \+= 1;\s*clearVisualSelection\(\);\s*liveWebsitePreviewVisible\.value = false;/);
});

test('every site area selects its own page and can open the live preview', async () => {
  const module = await readWorkbenchSource();
  // 不再只对 home 特判：按 slug 找到当前栏目的 pages 记录。
  assert.match(module, /async function selectSiteArea\(area\) \{[\s\S]*const page = pages\.value\.find\(\(record\) => String\(record\.slug \|\| ''\) === String\(area\)\);/);
  assert.match(module, /async function selectSiteArea\(area\) \{[\s\S]*activeTab\.value = 'pages';[\s\S]*if \(!liveWebsitePreviewVisible\.value\) await startLiveWebsitePreview\(\);/);
  // 页面记录缺失时保留模块总览，并关闭残留的预览会话。
  assert.match(module, /if \(!page\) \{[\s\S]*liveWebsitePreviewVisible\.value = false;[\s\S]*return;/);
  // 没有预览目标时按钮显示“打开实时预览”，不会残留“关闭实时预览”。
  assert.match(module, /\{\{ websitePreviewAvailable && liveWebsitePreviewVisible \? '关闭实时预览' : '打开实时预览' \}\}/);
});

test('canvas exposes upload, media attributes and toolbar create entry points', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /上传并替换/);
  assert.match(module, /保存素材信息/);
  assert.match(module, /api\.post\('\/media-poster\/asset'/);
  assert.match(module, /导入 Word 文档/);
  assert.match(module, /readWordArticle/);
  assert.match(module, /livePreviewRootSlug === 'news'/);
  // 顶部工具栏保留新增入口；列表底部的虚线和卡片红叉已移除。
  assert.match(module, />新增视频分享</);
  assert.match(module, />新建动态新闻</);
  // 专注画布切换内容时必须退出，否则编辑区被隐藏，看起来像界面卡死。
  assert.ok((module.match(/visualCanvasFocus\.value = false/g) || []).length >= 3);
  assert.match(module, /addSelectedVisualListItem/);
  assert.match(module, /版权状态/);
  assert.match(module, /封面/);
  // 文章 SEO 字段也集成进画布属性面板；摘要已从动态新闻编辑中移除。
  assert.match(module, /文章信息（审核必填）/);
  assert.match(module, /v-model\.trim="editorialDraft\.seo\.title"/);
  // 画布媒体替换支持从系统选择已有媒体；移除/删除素材按钮已取消。
  assert.match(module, /visualMediaReplacementOptions/);
  // 模板必须使用已声明的 visualStagingMediaAssets，不能写成未声明的
  // visualMediaStagingMediaAssets；后者会退化成 _ctx 并在选中媒体时抛 .length 错误。
  assert.doesNotMatch(module, /visualMediaStagingMediaAssets/);
  assert.match(module, /visualStagingMediaAssets/);
  assert.match(module, /replaceVideoShareCardMedia/);
  assert.match(module, /已选择系统媒体，保存页面草稿后官网生效/);
  assert.match(module, /deleteSelectedVideoShareCard/);
  assert.match(module, /删除这张视频分享卡片/);
  assert.match(module, /replaceArticleBodyImage/);
  assert.match(module, /selectedVisualIsArticleBodyImage/);
  assert.match(module, /删除这篇正文图片/);
  // 动态新闻封面必须写进 editorialDraft，而不是只改预览缓存。
  assert.match(module, /editorialDraft\.value\.cover_asset = assetId/);
  assert.match(module, /news\.dynamic_news\.cover/);
  assert.match(module, /删除文章后不要停留在 articles 列表卡片画布/);
  assert.match(module, /articlePreviewSurface\.value = 'list';/);
  assert.doesNotMatch(module, /class="visual-media-actions"/);
  assert.doesNotMatch(module, />从内容移除</);
  assert.doesNotMatch(module, />删除素材</);
  // 保存草稿时弹出命名对话框；默认名称可接受，也可修改后提交。
  assert.match(module, /openSaveNameDialog/);
  assert.match(module, /confirmSaveNameDialog/);
  assert.match(module, /saveNameDialogOpen/);
  // 保存后内容送审清单必须失效，不能停留在首次加载的快照。
  assert.match(module, /function invalidateSubmissionQueue\(\)/);
  assert.match(module, /invalidateSubmissionQueue\(\);/);
  assert.match(module, /if \(tab === 'submit'\) loadSubmissionQueue\(\);/);
  assert.doesNotMatch(module, /class="visual-draft-name"/);
  assert.match(module, /submission_name: draftSubmissionName\.value\.trim\(\) \|\| null/);
  // 视频分享新增入口切到媒体优先的卡片工作区，不再先建空文章。
  assert.match(module, /videoShareWorkspace\.value\?\.openCreate\(\)/);
  assert.match(module, /showVideoShareWorkspace/);
  // 候选视频可在画布直接删除素材，也可一键清空。
  assert.match(module, /deleteSelectedVisualArticle/);
  assert.match(module, /删除当前条目/);
  // 列表卡片换素材时必须落到 editorialDraft，否则保存草稿按钮一直是灰的。
  assert.match(module, /String\(editorialDraft\.value\?\.id \|\| ''\) !== String\(record\.id \|\| ''\)/);
  assert.match(module, /record = editorialDraft\.value \|\| activated\.record/);
  // 媒体替换必须把本次选择的值显式传给处理函数：v-model 与 @change 的执行顺序
  // 不保证，依赖 v-model 会读到旧值，表现就是“换了视频没反应”。
  assert.match(module, /:value="visualMediaSelection" @change="replaceVisualMedia\(\$event\.target\.value\)"/);
  assert.match(module, /function replaceVisualMedia\(selectedValue\)/);
});

test('canvas list create/delete actions route through workbench handlers', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /ruijun:cms-preview:create-article/);
  assert.match(module, /ruijun:cms-preview:delete-article/);
  assert.match(module, /function createArticleFromCanvas\(category\)/);
  assert.match(module, /async function confirmCreateArticle\(\)/);
  // 新增时可以选已有媒体，而不是只能稍后上传。
  assert.match(module, /const createArticleMediaOptions = computed/);
  assert.match(module, /稍后在详情画布补充/);
  assert.match(module, /async function deleteArticleFromCanvas\(payload\)/);
  // 管理员可删除已发布内容，其他角色仍只允许草稿。
  assert.match(module, /!technicalAccess\.value && !canDeleteEditorialDraft\(record\)/);
  assert.match(module, /window\.confirm\(`确定删除/);
});

test('service child page lists can move the canvas into resource and knowledge records', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /else if \(collection === 'knowledge_items'\) \{\s*activeTab\.value = 'knowledge';\s*selectKnowledge\(resolvedItemId, true\);/);
  assert.match(module, /knowledge: \{\s*knowledge_items: activeTab\.value === 'knowledge' \? preferVisualDraftRecord\(knowledgeItems\.value, knowledgeDraft\.value\) : knowledgeItems\.value\s*\}/);
});

test('site-area cards reload the page list once instead of silently ignoring a missing in-memory page', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /let page = pages\.value\.find\(\(record\) => record\.slug === siteArea\.value\);\s*if \(!page\) \{\s*await loadPages\(\);\s*page = pages\.value\.find\(\(record\) => record\.slug === siteArea\.value\);\s*\}/);
  assert.match(module, /if \(!page\) \{\s*error\.value = `未找到“\$\{siteAreaLabel\.value\}”对应的页面草稿，请重新加载后再试。`;\s*return;\s*\}/);
});

test('service location editing reads the nested contact object that its form saves', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /service_locations:\s*\[[^\]]*'contact'[^\]]*\]/);
  assert.match(module, /payload = \{ region:[\s\S]*contact,[\s\S]*business_status:/);
});

test('desktop workbench content keeps a safety gap from its fixed CMS navigation', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /html\.ruijun-workbench-active \.editor-page:not\(\.live-website-preview-active\) > section:not\(\.editor-guide\),[\s\S]*margin-left: 16px;/);
  assert.match(module, /html\.ruijun-workbench-active \.editor-page:not\(\.live-website-preview-active\) > \.empty[\s\S]*margin-left: 16px;/);
});

test('draft preview stays in the workbench flow instead of covering the editor', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /<section v-if="previewOpen" class="preview-panel" role="region" aria-labelledby="draft-preview-title">/);
  assert.doesNotMatch(module, /class="preview-backdrop"/);
  assert.doesNotMatch(module, /aria-modal="true" aria-labelledby="draft-preview-title"/);
  assert.match(module, /\.editor-page\s*>\s*\.preview-panel\s*\{[\s\S]*grid-column:\s*2[\s\S]*position:\s*relative/);
});

test('medium desktop live preview keeps form actions in a separate row instead of hiding the form', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /@media\(min-width:1280px\) and \(max-width:1599px\)\{[\s\S]*\.editor-page\.live-website-preview-active\{[\s\S]*grid-template-columns:176px minmax\(0,1fr\);[\s\S]*\.live-website-preview\{position:relative!important;[\s\S]*grid-column:2;grid-row:5/);
  assert.doesNotMatch(module, /@media\(min-width:1280px\) and \(max-width:1599px\)\{[\s\S]*\.editor-page\.live-website-preview-active>section:not\(\.editor-guide\),[\s\S]*display:none!important/);
});

test('mobile and narrow workbench canvases remain preview-only and explicitly disable visual editing state', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /function setVisualDevice\(device\) \{[\s\S]*?if \(device !== 'desktop'\) \{[\s\S]*?visualEditMode\.value = false;[\s\S]*?clearVisualSelection\(\);[\s\S]*?\}[\s\S]*?postLivePreviewUpdate\(\);/);
  assert.match(module, /const visualCanvasEditable = computed\(\(\) => canEditVisualCanvas\(\{ device: visualDevice\.value, viewportWidth: visualViewportWidth\.value \}\)\);/);
  assert.match(module, /function postLivePreviewUpdate\(forcedTarget = null\) \{[\s\S]*?const previewEditMode = visualCanvasEditable\.value && visualEditMode\.value;[\s\S]*?editMode: previewEditMode,/);
  assert.match(module, /function handleVisualViewportResize\(\) \{[\s\S]*?if \(!visualCanvasEditable\.value\) \{[\s\S]*?visualEditMode\.value = false;[\s\S]*?clearVisualSelection\(\);/);
  assert.match(module, /:disabled="!visualCanvasEditable"[^>]*@click="visualTool = 'select'/);
  assert.match(module, /:disabled="!visualCanvasEditable"[^>]*@click="toggleVisualEditMode"/);
});

test('homepage hero uses a dedicated governed video selector instead of the disconnected generic media list', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /from '\.\/homepage-hero-video\.js'/);
  assert.match(module, /v-if="isHomeHeroSection\(section\)" class="home-hero-video-editor"/);
  assert.match(module, /aria-label="首页首屏视频"/);
  assert.match(module, /@change="setHomeHeroVideo\(section, \$event\.target\.value\)"/);
  assert.match(module, /v-for="asset in homeHeroVideoOptionsForSection\(section\)"/);
});

test('qualification media editor offers governed internal-preview drafts and materializes them for the canvas', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /function qualificationMediaAssets\(\) \{/);
  assert.match(module, /filterPreviewStagingMediaAssets\(mediaCandidates\.value, \{ scope: 'qualification', placementKey: 'qualification\.image', elementType: 'image' \}\)/);
  assert.match(module, /<option value="">选择已上传资质素材<\/option>[\s\S]*v-for="asset in qualificationMediaAssets\(\)"/);
  assert.match(module, /companyMode\.value === 'qualifications'[\s\S]*previewMediaAsset\(reference\.media_asset_id\)/);
  assert.match(module, /function addCompanyMediaReference\(\) \{[\s\S]*isCompanyMediaSelectable/);
});

test('workbench uploads publish media assets immediately without a review step', async () => {
  const module = await readWorkbenchSource();
  const start = module.indexOf('async function createMediaCandidate()');
  assert.ok(start >= 0, 'createMediaCandidate must remain available for media uploads');
  // Bound the body by the next top-level function rather than naming one: a
  // specific name is a hidden dependency on file layout, and it broke the moment
  // that neighbour was extracted into a module.
  const next = module.indexOf('\nasync function ', start + 1);
  const nextSync = module.indexOf('\nfunction ', start + 1);
  const candidates = [next, nextSync].filter((i) => i > start);
  const end = candidates.length ? Math.min(...candidates) : module.length;
  assert.ok(end > start, 'createMediaCandidate must have a bounded function body');
  const body = module.slice(start, end);

  assert.match(body, /await api\.post\('\/files', form\)/);
  assert.match(body, /await api\.post\('\/items\/media_assets', \{[\s\S]*?status: 'published',[\s\S]*?publication_state: 'published',[\s\S]*?\}\);/);
});

test('successful saves renew the live preview authorization for the current target', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /async function renewLivePreviewAfterSuccessfulSave\(\) \{[\s\S]*liveWebsitePreviewVisible\.value[\s\S]*websitePreviewTarget\.value\?\.record\?\.id[\s\S]*startLiveWebsitePreview\(\);/);
  assert.match(module, /let livePreviewRootTarget = null;/);
  assert.match(module, /async function startLiveWebsitePreview\(\{ automatic = false, targetOverride = null, preserveRoot = false \} = \{\}\)/);
  assert.match(module, /const target = targetOverride \|\| \(automatic && livePreviewRootTarget \? livePreviewRootTarget : websitePreviewTarget\.value\);/);
  assert.match(module, /if \(!preserveRoot\) \{[\s\S]*?livePreviewRootTarget = \{ \.\.\.targetSnapshot, context: clone\(contextSnapshot\) \};[\s\S]*?livePreviewRootSlug\.value = /);
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
    'saveParameter'
  ];
  for (const name of saveFunctions) {
    const start = module.indexOf(`async function ${name}(`);
    assert.ok(start >= 0, `${name} must remain an async save function`);
    const next = module.indexOf('\nasync function ', start + 1);
    const body = module.slice(start, next >= 0 ? next : module.length);
    assert.match(body, /(await renewLivePreviewAfterSuccessfulSave\(\);|await refreshAfterSave\()/, `${name} must renew the live preview after success`);
  }
});

test('canvas media selections preserve the default-media flag and allow product covers to restore the website fallback', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /allowDefaultMedia: event\.data\.allowDefaultMedia === true/);
  assert.match(module, /function canRestoreVisualMediaDefault\([\s\S]*collection === 'product_series' && path === 'cover_asset'/);
  assert.match(module, /selectedVisualCanRestoreDefault \? \(selectedVisualElement\.elementType === 'video' \? '沿用官网原视频' : '沿用官网原图'\) : '选择系统中的媒体'/);
});

test('manual live-preview reconnect preserves the original page canvas after selecting a related record', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /@click="reconnectLiveWebsitePreview"/);
  assert.match(module, /function reconnectLiveWebsitePreview\(\)[\s\S]*targetOverride: livePreviewRootTarget, preserveRoot: true/);
});

test('canvas page selection keeps the website-area navigation aligned with the selected page slug', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /function syncSiteAreaForPage\(page\) \{[\s\S]*const slug = String\(page\?\.slug \|\| ''\)\.trim\(\);[\s\S]*if \(Object\.hasOwn\(siteAreaLabels, slug\)\) siteArea\.value = slug;/);
  assert.match(module, /const resolved = resolveVisualEditingRecord\([\s\S]*if \(!resolved\) return null;[\s\S]*requiresVisualDraftSwitchConfirmation\([\s\S]*if \(collection === 'pages'\) syncSiteAreaForPage\(resolved\.record\);/);
});

test('failed saves preserve the draft and show a specific expired-session recovery message', async () => {
  const module = await readWorkbenchSource();
  // These are two separate facts, asserted separately. The original single
  // pattern spanned from apiStatus to the 401/403 branch purely because both sat
  // in one file, in that order; extracting apiStatus into a module made the
  // ordering accidental rather than meaningful.
  assert.match(module, /function apiStatus\(reason\)/);
  assert.match(module, /if \(status === 401\)/);
  assert.match(module, /登录会话已失效。未保存内容仍保留在页面中，请重新登录后保存。/);
  assert.match(module, /if \(status === 403\)/);
  assert.match(module, /当前内容不能保存：/);
  assert.match(module, /当前账号没有该字段的保存权限/);
  assert.match(module, /当前账号没有保存权限：/);
  assert.match(module, /function setSaveError\(reason, fallback\)[\s\S]*message\.value = '';/);
  assert.match(module, /async function savePage\(\)[\s\S]*catch \(reason\) \{[\s\S]*setSaveError\(reason, '保存页面失败，内容没有更新。'\);/);
  assert.match(module, /async function saveModel\(\)[\s\S]*catch \(reason\) \{[\s\S]*setSaveError\(reason, '保存型号失败，内容没有更新。'\);/);
  assert.match(module, /async function saveEditorialRecord\(\)[\s\S]*catch \(reason\) \{[\s\S]*setSaveError\(reason, '保存内容草稿失败，内容没有更新。'\);/);
});

test('adding a page media asset assigns a bindable role instead of an empty one', async () => {
  const module = await readWorkbenchSource();
  // An empty role matches no binding, which leaves the canvas element read-only
  // and made the homepage reason background impossible to replace.
  assert.doesNotMatch(module, /media_asset_id: assetId, role: ''/);
  // The role resolver belongs to the extracted pure layer; the component only
  // hands it the live candidate list.
  assert.match(module, /export function defaultPageMediaRole\(section, assetId, options = \[\]\)/);
  assert.match(module, /if \(tail === 'machine'\) return 'foreground';/);
  assert.match(module, /if \(pageMediaSlotRoles\.has\(tail\)\) return tail;/);
  assert.match(module, /if \(section\?\.mode === 'machine'\) return 'foreground';/);
  assert.match(module, /if \(section\?\.mode === 'photo'\) return 'background';/);
  assert.match(module, /role: defaultPageMediaRole\(section, assetId, pageMediaOptions\(scope\)\)/);
  assert.match(module, /const pageMediaSlotRoles = new Set\(\[[\s\S]*'background'[\s\S]*'foreground'[\s\S]*\]\);/);
});

test('page section insertion uses registered types and generated IDs instead of an unsaveable blank id', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /listPageSectionDefinitions\(String\(pageDraft\.value\?\.slug \|\| ''\)\)/);
  assert.match(module, /@click="openSectionLibrary"/);
  assert.match(module, /function addPageSection\(type\)[\s\S]*createPageSectionInstance\(type, pageDraft\.value\.slug, pageDraft\.value\.sections\)/);
  assert.match(module, /function validateSections\(sections, pageSlug = pageDraft\.value\?\.slug\)[\s\S]*validatePageSectionInstance\(section, pageSlug\)/);
  assert.doesNotMatch(module, /function addPageSection\(\)\s*\{\s*pageDraft\.value\?\.sections\.push\(\{ id: ''/);
  assert.match(module, /function toggleRegisteredPageSection\(section\)/);
  assert.match(module, /确定删除.*删除会在保存草稿后生效/);
});

test('registered media and list fields render a working panel driven by the schema', async () => {
  const module = await readWorkbenchSource();

  // Field controls branch on the registry's field type instead of a hardcoded table.
  assert.match(module, /v-for="field in registeredPageSectionFields\(section\)"/);
  assert.match(module, /field\.type === 'media'/);
  assert.match(module, /field\.type === 'list'/);

  // Media reuses the governed picker; list reuses the repeating-item editor.
  assert.match(module, /function addRegisteredSectionMedia\(section, field\)/);
  assert.match(module, /function removeRegisteredSectionMedia\(section, field, assetId\)/);
  assert.match(module, /function addRegisteredSectionItem\(section, field\)/);
  assert.match(module, /function moveRegisteredSectionItem\(section, field, index, delta\)/);
  assert.match(module, /function removeRegisteredSectionItem\(section, field, index\)/);

  // A media field must respect its declared cap rather than growing unbounded.
  assert.match(module, /field\.maxItems \?\? 1|Number\.isInteger\(field\.maxItems\) \? field\.maxItems : 1/);
  assert.match(module, /最多只能有 \$\{max\} 个素材/);
  assert.match(module, /最多只能有 \$\{max\} 项/);

  // List items are created from the declared item fields, never a free-form object.
  assert.match(module, /field\.itemFields \|\| \[\]\)\.map\(\(itemField\) => \[itemField\.key, ''\]\)/);
});

test('page section reordering and duplication stay schema-driven and keep ids unique', async () => {
  const module = await readWorkbenchSource();

  // Dragging is only offered for registry blocks, which carry generated ids.
  assert.match(module, /:draggable="canEdit\(pageDraft\) && !!section\.type"/);
  assert.match(module, /@dragstart="handleSectionDragStart\(section, \$event\)"/);
  assert.match(module, /@drop="handleSectionDrop\(section\)"/);
  assert.match(module, /function handleSectionDrop\(section\)/);
  assert.match(module, /function movePageSection\(from, to\)/);
  assert.match(module, /sections\.splice\(from, 1\)[\s\S]*sections\.splice\(to, 0, entry\)/);

  // Duplication mints a fresh registered id and carries the editable content over.
  assert.match(module, /@click="duplicatePageSection\(section\)"/);
  assert.match(module, /function duplicatePageSection\(section\)/);
  assert.match(module, /createPageSectionInstance\(section\.type, pageDraft\.value\.slug, sections\)/);
  assert.match(module, /sections\.splice\(index \+ 1, 0, \{ \.\.\.section, \.\.\.clone \}\)/);

  // The rendered list can be a filtered group, so edits resolve the real position
  // from the section object rather than trusting the v-for index.
  assert.match(module, /function pageSectionIndex\(section\)/);
  assert.match(module, /@click="removePageSection\(section\)"/);
  assert.doesNotMatch(module, /@click="removePageSection\(index\)"/);
});

test('the workbench exposes a full-page outline and a categorized section library', async () => {
  const module = await readWorkbenchSource();

  // The outline maps the whole page, independent of the editor's group filter.
  assert.match(module, /const sectionOutline = computed\(\(\) => \{[\s\S]*pageDraft\.value\?\.sections/);
  assert.match(module, /class="section-outline"/);
  assert.match(module, /@click="focusPageSection\(entry\.id\)"/);
  assert.match(module, /function focusPageSection\(sectionId\)/);
  assert.match(module, /scrollIntoView\(\{ behavior: 'smooth', block: 'start' \}\)/);
  assert.match(module, /v-if="entry\.hidden"/);

  // The library groups registered types by their declared category.
  assert.match(module, /const sectionLibraryGroups = computed\(\(\) => \{[\s\S]*definition\.category/);
  assert.match(module, /@click="openSectionLibrary"/);
  assert.match(module, /@click="addLibrarySection\(definition\.type\)"/);
  assert.match(module, /function addLibrarySection\(type\)/);
  assert.match(module, /role="dialog"/);
  assert.match(module, /definition\.description/);

  // Adding a block now goes through the library, not a flat dropdown.
  assert.doesNotMatch(module, /class="section-type-picker"/);
  assert.doesNotMatch(module, /addSelectedPageSection/);
});

test('select and number fields get schema-driven controls', async () => {
  const module = await readWorkbenchSource();

  assert.match(module, /field\.type === 'select'/);
  assert.match(module, /field\.type === 'number'/);
  // Select renders the declared options only, labelled through the source catalogue.
  assert.match(module, /v-for="option in field\.options"/);
  assert.match(module, /sectionSelectOptionLabel\(field, option\)/);
  assert.match(module, /field\?\.optionLabels\?\.\[value\]/);
  // Number input is clamped to the declared range.
  assert.match(module, /v-model\.number="section\[field\.key\]"/);
  assert.match(module, /:min="field\.min" :max="field\.max"/);
});

test('declared presets are offered on the block and applied without per-type logic', async () => {
  const module = await readWorkbenchSource();

  assert.match(module, /registeredPageSectionPresets\(section\)/);
  assert.match(module, /listPageSectionPresets\(section\.type, pageDraft\.value\?\.slug \|\| ''\)/);
  assert.match(module, /@click="applyRegisteredSectionPreset\(section\)"/);
  assert.match(module, /function applyRegisteredSectionPreset\(section\)/);
  // The whole application is a registry call — no per-type branching here.
  assert.match(module, /Object\.assign\(section, applyPageSectionPreset\(section, key, pageDraft\.value\.slug\)\)/);
  // The selection resets so the same preset can be re-applied.
  assert.match(module, /sectionPresetSelection\.value\[section\.id\] = ''/);
});

test('a block can be copied on one page and pasted onto another', async () => {
  const module = await readWorkbenchSource();

  assert.match(module, /const copiedPageSection = ref\(null\)/);
  assert.match(module, /function copyPageSectionForReuse\(section\)/);
  assert.match(module, /function pastePageSection\(\)/);
  assert.match(module, /@click="copyPageSectionForReuse\(section\)"/);
  assert.match(module, /@click="pastePageSection"/);

  // Paste is only offered when the target page registers the type.
  assert.match(module, /const canPastePageSection = computed\(\(\) => \{[\s\S]*getPageSectionDefinition\(copied\.type, pageDraft\.value\.slug\)/);
  assert.match(module, /当前页面没有注册该区块类型，无法粘贴。/);

  // The pasted block is a fresh instance, so the two stay independent.
  assert.match(module, /createPageSectionInstance\(copied\.type, pageDraft\.value\.slug, sections\)/);
  assert.match(module, /sections\.push\(\{ \.\.\.copied, \.\.\.clone \}\)/);
});

test('registry field edits reach the live canvas as they are typed', async () => {
  const module = await readWorkbenchSource();

  assert.match(module, /function pushPageDraftToPreview\(\)/);
  assert.match(module, /queueLivePreviewUpdate\(\{ collection: 'pages', record: pageDraft\.value \}\)/);

  // Text, textarea, select, number and both list-item inputs must all be wired —
  // a missing one leaves the panel and the canvas disagreeing with no error.
  const wiring = (module.match(/pushPageDraftToPreview/g) || []).length;
  assert.ok(wiring >= 7, `expected the preview push on every registry input, found ${wiring}`);
  assert.match(module, /@change="pushPageDraftToPreview"/);
});

test('the service page stays saveable: canvas-only media slots are stripped before validation', async () => {
  const { hydrateServiceActionMediaFields } = await import('../extensions/content-editor-workbench/src/visual-editing-fields.js');
  const { normalizePageMediaReferences } = await import('../extensions/content-editor-workbench/src/page-media-references.js');
  const { validatePageSectionInstance } = await import('../../website/shared/page-section-registry.mjs');

  // The canvas hydrates one selectable slot per card so an editor can click any
  // position to attach an image. Those slots carry no asset id.
  const hydrated = hydrateServiceActionMediaFields({
    id: 'support-actions',
    type: 'card-grid',
    version: 1,
    enabled: true,
    items: [{ title: '我的维修申请' }, { title: '保修状态验核' }]
  });
  assert.equal(hydrated.media.length, 2, 'the canvas expects one slot per card');
  assert.deepEqual(hydrated.media.map((entry) => entry.media_asset_id), ['', '']);

  // Validating the canvas draft rejects the placeholders as "未登记的素材". This
  // is why savePage() must normalize first: validating the raw draft blocked every
  // save on a page that hydrates slots.
  assert.match(validatePageSectionInstance(hydrated, 'service'), /未登记的素材/);

  // Normalizing first — the order savePage() now uses — drops the empty slots and
  // the section validates, so the save proceeds.
  const persisted = { ...hydrated, media: normalizePageMediaReferences(hydrated.media) };
  assert.deepEqual(persisted.media, []);
  assert.equal(validatePageSectionInstance(persisted, 'service'), '');

  // A real asset reference must still survive normalization and still validate.
  const withAsset = { ...hydrated, media: normalizePageMediaReferences([{ role: 'action-1', media_asset_id: ' 42 ' }]) };
  assert.deepEqual(withAsset.media, [{ media_asset_id: '42', role: 'action-1' }]);
  assert.equal(validatePageSectionInstance(withAsset, 'service'), '');
});

test('savePage validates the persisted section shape, not the canvas draft', async () => {
  const module = await readWorkbenchSource();

  assert.match(module, /const persistedSections = normalizeSections\(pageDraft\.value\.sections\);\s*\n\s*const sectionError = validateSections\(persistedSections\);/);

  // The reverse order is the bug: validation must not run on the raw draft.
  assert.doesNotMatch(module, /validateSections\(pageDraft\.value\.sections\)/);
});

test('series and model details can be initialized from the original page defaults', async () => {
  const module = await readWorkbenchSource();

  // The seed copy lives in one shared module so the page and the workbench cannot
  // drift apart.
  assert.match(module, /from '\.\.\/\.\.\/\.\.\/\.\.\/website\/shared\/product-series-details\.mjs'/);
  assert.match(module, /import \{ defaultModelConfiguration, defaultSeriesDetail, normalizeSeriesDetail, seriesDetailKey \}/);

  assert.match(module, /id="series-detail-title"/);
  // Only solution-type series own a series-level detail; machine families keep
  // theirs on the model.
  assert.match(module, /const seriesSupportsDetail = computed/);
  assert.match(module, /<section v-if="seriesSupportsDetail" class="section-editor" aria-labelledby="series-detail-title">/);
  assert.match(module, /@click="initializeSeriesDetail"/);
  assert.match(module, /@click="initializeModelDetail"/);
  assert.match(module, /function initializeSeriesDetail\(\) \{[\s\S]*?defaultSeriesDetail\(/);
  assert.match(module, /function initializeModelDetail\(\) \{[\s\S]*?defaultModelConfiguration\(/);
  assert.match(module, /function addSeriesDetailFeature\(\)/);
  assert.match(module, /function removeSeriesDetailFeature\(index\)/);

  // Unsaved detail must reach the canvas through the same shape the page reads,
  // and the canvas edits `detail.*` on the draft.
  assert.match(module, /record\.detail = detail;/);
  assert.match(module, /presentation\.detail = \{/);
});

test('feature images bound on the canvas resolve to the authorized preview path', async () => {
  const module = await readWorkbenchSource();

  // The stored value is a media asset id; the page renders `image`.
  assert.match(module, /configuration\.features = parseArray\(configuration\.features\)\.map\(\(item\) => \{[\s\S]*?previewMediaAsset\(item\.media_asset_id\)[\s\S]*?image: media\.path/);
});

test('product media placements cover the series card and the detail machine photo', async () => {
  const catalog = await readFile(new URL('../extensions/content-editor-workbench/src/media-placement-catalog.js', import.meta.url), 'utf8');
  const module = await readWorkbenchSource();

  // Without this option the upload form cannot produce the asset the series
  // cover select asks for, so the select stays empty forever.
  assert.match(catalog, /\{ key: 'product\.series\.cover', label: '产品系列封面', mediaType: 'image', minWidth: 800, minHeight: 500/);
  assert.match(catalog, /'product\.series\.cover': \{ pageKey: 'product' \}/);

  // The series form can bind the machine photo and the per-feature thumbnails.
  assert.match(module, /<label>设备主图<select v-model="seriesDraft\.detail\.machine_asset_id"/);
  assert.match(module, /<label>图片<select v-model="feature\.media_asset_id"/);
});

test('canvas cover and feature images resolve to authorized preview URLs', async () => {
  const module = await readWorkbenchSource();

  assert.match(module, /const cover = previewMediaAsset\(coverAssetId\);\s*\n\s*if \(cover\) record\.cover_asset = cover\.path;/);
  assert.match(module, /configuration\.features = parseArray\(configuration\.features\)\.map\(\(item\) => \{[\s\S]*?previewMediaAsset\(item\.media_asset_id\)[\s\S]*?image: media\.path/);
});

test('canvas list buttons add and remove detail rows through the workbench', async () => {
  const module = await readWorkbenchSource();

  // The page-owned action is forwarded as a workbench command…
  assert.match(module, /if \(event\.data\?\.type === 'ruijun:cms-preview:list-add'\) \{/);
  assert.match(module, /if \(event\.data\?\.type === 'ruijun:cms-preview:list-remove'\) \{/);
  assert.match(module, /function applyCanvasListAction\(kind, payload\)/);
  // …restricted to the two product-detail arrays.
  assert.match(module, /const canvasListPaths = new Set\(\['configuration\.features', 'detail\.features'\]\);/);
  assert.match(module, /if \(!canvasListPaths\.has\(requestedPath\)\) return;/);
  // The owner comes from the series code: the page cannot see draft models.
  assert.match(module, /function canvasListOwner\(payload\) \{/);
  assert.match(module, /const model = models\.value\.find\(\(candidate\) => String\(candidate\.series_code \|\| ''\) === seriesCode\);/);
  assert.match(module, /if \(!owner\) \{ error\.value = '画布没有识别到该详情所属的系列/);
  assert.match(module, /const removed = removeVisualListItemAt\(record, path, index\);/);
  assert.match(module, /const added = appendVisualListItem\(record, path\);/);
  // Unsaved rows must reach the canvas: series detail keeps blank rows.
  assert.match(module, /normalizeSeriesDetail\(record\.detail, \{ keepEmpty: true \}\)/);
});

test('canvas parameter buttons create and delete draft parameter records', async () => {
  const module = await readWorkbenchSource();

  assert.match(module, /if \(event\.data\?\.type === 'ruijun:cms-preview:parameter-add'\) \{/);
  assert.match(module, /if \(event\.data\?\.type === 'ruijun:cms-preview:parameter-remove'\) \{/);
  assert.match(module, /async function addCanvasParameter\(payload\) \{/);
  assert.match(module, /async function removeCanvasParameter\(payload\) \{/);
  // A new row is a draft record owned by the displayed model.
  assert.match(module, /await api\.post\('\/items\/product_parameters', \{[\s\S]*?model_code: modelCode[\s\S]*?field_name: '新参数'[\s\S]*?status: 'draft'[\s\S]*?publication_state: 'unpublished'/);
  // Deleting never touches a published or in-review row.
  assert.match(module, /if \(!canDeleteContent\(record\)\) \{[\s\S]*?已发布或审核中的参数不能直接删除/);
  assert.match(module, /await api\.delete\(`\/items\/product_parameters\/\$\{encodeURIComponent\(id\)\}`\)/);
});

test('the workbench reopens a canvas whose draft session was lost', async () => {
  const module = await readWorkbenchSource();

  assert.match(module, /if \(event\.data\?\.type === 'ruijun:cms-preview:session-missing'\) \{/);
  assert.match(module, /let lastPreviewSessionRecoveryAt = 0;/);
  assert.match(module, /if \(now - lastPreviewSessionRecoveryAt < 30000\) return;/);
  assert.match(module, /预览会话已失效（超过 15 分钟未操作，或页面被导航到普通地址），正在自动恢复/);
  assert.match(module, /void reconnectLiveWebsitePreview\(\);/);
});

test('canvas "＋" seeds the website original before appending a row', async () => {
  const module = await readWorkbenchSource();

  // Appending to an empty configuration would hide the fallback copy, so the
  // command initializes the detail first and refuses when nothing can be seeded.
  assert.match(module, /function seedCanvasListDetail\(collection, record\) \{/);
  assert.match(module, /if \(collection === 'product_models'\) \{[\s\S]{0,400}initializeModelDetail\(\);[\s\S]{0,600}initializeSeriesDetail\(\);/);
  assert.match(module, /该型号没有可初始化的官网原版详情/);
  assert.match(module, /已写入官网原版详情并追加一条空白条目/);
  // Removing a fallback row seeds first too, so "×" acts on real draft data.
  assert.match(module, /if \(!seedCanvasListDetail\(collection, record\)\) return;\s*\n\s*const removed = removeVisualListItemAt\(record, path, index\);/);
  assert.match(module, /listLabel/);
});

test('canvas model buttons create and delete model records with guards', async () => {
  const module = await readWorkbenchSource();

  assert.match(module, /if \(event\.data\?\.type === 'ruijun:cms-preview:model-add'\) \{/);
  assert.match(module, /if \(event\.data\?\.type === 'ruijun:cms-preview:model-remove'\) \{/);
  assert.match(module, /async function addCanvasModel\(payload\) \{/);
  assert.match(module, /async function removeCanvasModel\(payload\) \{/);
  // The canvas chip shows the name; a shared "新机型" made new models look
  // identical until an editor renamed each one.
  assert.match(module, /name: `新机型-\$\{siblings\.length \+ 1\}`/);
  // A new model is a draft seeded from the website original.
  assert.match(module, /await api\.post\('\/items\/product_models', \{[\s\S]{0,400}?status: 'draft',[\s\S]{0,120}?publication_state: 'unpublished'/);
  // Published models and models that still own parameters cannot be deleted.
  assert.match(module, /已发布或审核中的机型不能直接删除/);
  assert.match(module, /该机型还有技术参数，请先删除参数后再删除机型/);
  assert.match(module, /await api\.delete\(`\/items\/product_models\/\$\{encodeURIComponent\(String\(record\.id\)\)\}`\)/);
});

test('canvas series cards can be created and deleted with guards', async () => {
  const module = await readWorkbenchSource();

  assert.match(module, /if \(event\.data\?\.type === 'ruijun:cms-preview:series-add'\) \{/);
  assert.match(module, /if \(event\.data\?\.type === 'ruijun:cms-preview:series-remove'\) \{/);
  assert.match(module, /async function addCanvasSeries\(\) \{/);
  assert.match(module, /async function removeCanvasSeries\(payload\) \{/);
  assert.match(module, /await api\.post\('\/items\/product_series', \{[\s\S]{0,320}?status: 'draft',[\s\S]{0,120}?publication_state: 'unpublished'/);
  // Draft models/parameters cascade; published children block the delete.
  assert.match(module, /该系列下有 \$\{undeletableModels\.length\} 台已发布或审核中的机型/);
  assert.match(module, /确认删除系列「\$\{record\.name \|\| record\.series_code\}」\$\{cascadeNote\}/);
  assert.match(module, /已发布或审核中的系列不能直接删除/);
});

test('switching the canvas item re-opens the preview for the new record', async () => {
  const module = await readWorkbenchSource();

  assert.match(module, /const activated = activateVisualEditingTarget\(\{ collection, itemId: nextId, sectionKey: websitePreviewContext\.value\.sectionKey \}, \{ discardConfirmed: true \}\);/);
  assert.match(module, /if \(!activated\?\.record\) return false;/);
  // Without this the canvas stayed on the previous record's page and nothing was editable.
  assert.match(module, /void startLiveWebsitePreview\(\{ targetOverride: \{ collection: activated\.collection, record: activated\.record \} \}\);/);
  assert.match(module, /已切换条目，正在重新加载画布/);
});

test('the property panel saves in place instead of sending the operator to the toolbar', async () => {
  const module = await readWorkbenchSource();

  assert.match(module, /<div class="visual-property-save">/);
  assert.match(module, /class="primary-action" title="只保存当前选中的这一条记录" :disabled="saving \|\| \(!hasUnsavedChanges && selectedVisualRecord\?\.collection !== 'articles'\)" @click="openSaveNameDialog">\{\{ saving \? '保存中\.\.\.' : '保存当前条目' \}\}/);
  assert.match(module, /有未保存修改/);
  // The item switcher only lists records of the page being edited.
  assert.match(module, /function scopeVisualRecordChoices\(collection, records\) \{/);
  assert.match(module, /if \(collection === 'product_models'\) \{/);
});

test('switching a series or model keeps its unsaved draft instead of discarding it', async () => {
  const module = await readWorkbenchSource();

  assert.match(module, /const productDraftCache = new Map\(\);/);
  assert.match(module, /function stashProductDraft\(\) \{/);
  assert.match(module, /productDraftCache\.set\(productDraftKey\('product_series', selectedSeriesId\.value\)/);
  assert.match(module, /productDraftCache\.set\(productDraftKey\('product_models', selectedModelId\.value\)/);
  // selectSeries/selectModel restore the cached draft and its saved baseline.
  assert.match(module, /const cached = productDraftCache\.get\(productDraftKey\('product_series', id\)\);/);
  assert.match(module, /const cached = productDraftCache\.get\(productDraftKey\('product_models', selectedModelId\.value\)\);/);
  assert.match(module, /savedDraftFingerprint\.value = cached\.savedFingerprint;/);
  // A saved draft refreshes the cache; a discarded one is removed from it.
  assert.match(module, /stashProductDraft\(\);\s*\n\}/);
  assert.match(module, /dropCachedProductDraft\('product_models', selectedModelId\.value\);/);
});

test('page and homepage-section drafts are cached, and the toolbar counts unsaved items', async () => {
  const module = await readWorkbenchSource();

  assert.match(module, /productDraftCache\.set\(productDraftKey\('pages', selectedPageId\.value\)/);
  assert.match(module, /productDraftCache\.set\(productDraftKey\('homepage_sections', homepageSectionDraft\.value\.id\)/);
  assert.match(module, /const cached = productDraftCache\.get\(productDraftKey\('pages', id\)\);/);
  assert.match(module, /const cached = productDraftCache\.get\(productDraftKey\('homepage_sections', record\?\.id\)\);/);
  assert.match(module, /const unsavedDraftCount = computed\(\(\) => \{/);
  assert.match(module, /本页未保存 \$\{unsavedDraftCount\} 项/);
});

test('the unsaved badge renders no literal escape text in the toolbar', async () => {
  const module = await readWorkbenchSource();
  assert.doesNotMatch(module, /`r`n/);
  assert.match(module, /<span v-if="unsavedDraftCount" class="visual-unsaved-count"/);
});

test('the toolbar saves every dirty draft of the page and reports the result', async () => {
  const module = await readWorkbenchSource();

  assert.match(module, /async function saveWholePage\(submissionName = ''\) \{/);
  assert.match(module, /const pendingKeys = dirtyCachedDraftKeys\(\)/);
  assert.match(module, /const activated = await activateCachedDraft\(key\);/);
  assert.match(module, /已保存 \$\{savedCount\} 项记录/);
  // The toolbar button drives the batch save; articles keep the naming dialog.
  assert.match(module, /function handleToolbarSave\(\) \{/);
  assert.match(module, /openBatchSubmissionDialog\(\);/);
  assert.match(module, /await saveWholePage\(name\);/);
  assert.match(module, /const toolbarSaveLabel = computed\(\(\) => \{/);
});

test('a freshly loaded draft is not reported as unsaved after hydration', async () => {
  const module = await readWorkbenchSource();

  // Draft hydration mutates the clone after the first render; without the second
  // baseline every card click asked to discard changes the operator never made.
  assert.match(module, /function markDraftSavedAfterHydration\(\) \{/);
  assert.match(module, /let pendingHydrationBaseline = false;/);
  assert.match(module, /pendingHydrationBaseline = true;\s*\n\s*nextTick\(\(\) => \{/);
  assert.match(module, /markDraftSavedAfterHydration\(\);/);
});

test('switching canvas targets never asks to discard a kept draft', async () => {
  const module = await readWorkbenchSource();

  // These collections stash their drafts on switch, so the prompt is obsolete and
  // made an ordinary card click look destructive.
  assert.match(module, /const keepsDraftOnSwitch = new Set\(\['pages', 'homepage_sections', 'product_series', 'product_models'\]\);/);
  assert.match(module, /&& !keepsDraftOnSwitch\.has\(collection\)/);
});

test('a batch save is submitted as one version and keeps the newest draft per record', async () => {
  const module = await readWorkbenchSource();

  assert.match(module, /const batchId = `batch-\$\{Date\.now\(\)\.toString\(36\)\}`;/);
  // Newest wins: newer cached drafts are applied first and the active record is
  // never taken from the cache.
  assert.match(module, /\.sort\(\(left, right\) => \(productDraftCache\.get\(right\)\?\.savedAt \|\| 0\) - \(productDraftCache\.get\(left\)\?\.savedAt \|\| 0\)\)/);
  assert.match(module, /const blocked = targets\.filter\(\(target\) => target\.record && !canEdit\(target\.record\)\)/);
  assert.match(module, /批次未开始：/);
  assert.match(module, /批次已停止：/);
});

test('a model spec row seeds the whole official table before the first edit', async () => {
  const module = await readWorkbenchSource();

  assert.match(module, /function seedCanvasParameterRows\(target, fieldPath, payload\) \{/);
  assert.match(module, /const isModelTable = path\.startsWith\('configuration\.parameters\.'\);/);
  assert.match(module, /const isSeriesTable = path\.startsWith\('presentation\.parameters\.'\);/);
  assert.match(module, /if \(Array\.isArray\(target\.configuration\.parameters\) && target\.configuration\.parameters\.length\) return false;/);
  assert.match(module, /target\.configuration\.parameters = rows\.map\(\(row\) => \(\{/);
  assert.match(module, /target\.presentation\.parameters = rows\.map\(\(row\) => \(\{/);
  assert.match(module, /seedCanvasParameterRows\(fieldTarget, fieldPath, event\.data\);/);
});

test('deleting a canvas parameter works even when its model list is not loaded', async () => {
  const module = await readWorkbenchSource();
  assert.match(module, /async function removeCanvasParameter\(payload\) \{/);
  assert.match(module, /if \(!id\) \{ error\.value = '没有识别到要删除的参数。'; return; \}/);
  assert.match(module, /const response = await api\.get\(`\/items\/product_parameters\/\$\{encodeURIComponent\(id\)\}`\);/);
  assert.match(module, /if \(!record\) \{ error\.value = '没有找到这条参数，可能已被删除。'; return; \}/);
});
