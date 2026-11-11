import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');

async function readSource(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

test('video sharing uses the media-first card workspace instead of the article form', async () => {
  const module = await readSource('extensions/content-editor-workbench/src/module.vue');
  assert.match(module, /import VideoShareWorkspace from '\.\/video-share-workspace\.vue';/);
  assert.match(module, /showVideoShareWorkspace/);
  assert.match(module, /<VideoShareWorkspace v-if="showVideoShareWorkspace"/);
  assert.match(module, /:class="showVideoShareWorkspace \? 'video-share-tab' : 'workspace-grid'"/);
  assert.match(module, /async function handleVideoShareChanged\(\) \{[\s\S]*loadEditorial\(\)[\s\S]*loadMediaAssets\(\)[\s\S]*loadMediaCandidates\(\)/);
  assert.match(module, /if \(entry\.action === 'videos'\) \{[\s\S]*selectedEditorialId\.value = '';[\s\S]*editorialDraft\.value = null;/);
});

test('new video share can use a local file or an existing media asset', async () => {
  const workspace = await readSource('extensions/content-editor-workbench/src/video-share-workspace.vue');
  assert.match(workspace, /从电脑选择文件/);
  assert.match(workspace, /使用系统已上传媒体/);
  assert.match(workspace, /<input type="file" accept="video\/mp4,video\/webm,\.mp4,\.webm"/);
  assert.match(workspace, /选择已有视频/);
  assert.match(workspace, /videoOptions/);
  // 使用范围、展示位置和所属页面沿用媒体资产上传的必填项并自动固定。
  assert.match(workspace, /视频素材必填项/);
  assert.match(workspace, /使用范围：视频新闻/);
  assert.match(workspace, /官网展示位置：视频分享列表/);
  assert.match(workspace, /所属页面 \/ 段落：news \/ video-sharing/);
  assert.match(workspace, /版权状态/);
  assert.match(workspace, /视频封面/);
  assert.match(workspace, /字幕或文字稿/);
});

test('video sharing never offers article fields or creates an article', async () => {
  const workspace = await readSource('extensions/content-editor-workbench/src/video-share-workspace.vue');
  const helper = await readSource('extensions/content-editor-workbench/src/video-share-cards.js');
  assert.doesNotMatch(workspace, /补充文章内容/);
  assert.doesNotMatch(workspace, /includeArticle/);
  assert.doesNotMatch(workspace, /videoShareArticle/);
  assert.doesNotMatch(workspace, /api\.post\('\/items\/articles'/);
  assert.doesNotMatch(workspace, /items\/articles/);
  assert.doesNotMatch(helper, /videoShareArticle/);
  // 视频分享卡片只来自媒体资产。
  assert.match(workspace, /buildVideoShareCards\(\{ mediaAssets: mediaAssets\.value \}\)/);
  assert.match(workspace, /items\/media_assets/);
});

test('editing switches the video asset and keeps the card title', async () => {
  const workspace = await readSource('extensions/content-editor-workbench/src/video-share-workspace.vue');
  const helper = await readSource('extensions/content-editor-workbench/src/video-share-cards.js');
  assert.match(workspace, /function selectExistingAsset\(\)/);
  assert.match(workspace, /applyVideoAssetToEditor/);
  assert.match(workspace, /这个视频已经属于另一张视频分享卡片/);
  assert.match(helper, /next\.title = text\(next\.title, 240\) \|\|/);
  assert.match(helper, /videoShareMediaUpdatePayload/);
  // 换成另一条视频后，旧素材要删除，避免留下两张卡片。
  assert.match(workspace, /previousMediaId/);
  assert.match(workspace, /removeMediaAsset\(previousMediaId\)/);
});

test('deleting a video share removes the video asset and the card together', async () => {
  const workspace = await readSource('extensions/content-editor-workbench/src/video-share-workspace.vue');
  assert.match(workspace, /视频分享只有视频，删除后视频素材和这张卡片会一起从官网移除/);
  assert.doesNotMatch(workspace, /只删除视频，保留卡片/);
  assert.doesNotMatch(workspace, /deleteMode/);
  assert.doesNotMatch(workspace, /videoShareArticleRemovalPayload/);
  assert.match(workspace, /removeMediaAsset\(card\.mediaAssetId\)/);
  assert.match(workspace, /已删除视频分享/);
});

test('card edits must be applied before the named media resource can be uploaded', async () => {
  const workspace = await readSource('extensions/content-editor-workbench/src/video-share-workspace.vue');
  assert.match(workspace, /保存修改内容/);
  assert.match(workspace, /上传媒体资源/);
  assert.match(workspace, /保存名称（上传媒体资源必填）/);
  assert.match(workspace, /先点击“保存修改内容”，才能上传媒体资源/);
  assert.match(workspace, /const canSaveDraft = computed\(\(\) => Boolean\([\s\S]*savedFingerprint\.value[\s\S]*!editorDirty\.value[\s\S]*editor\.value\.save_name/);
  assert.match(workspace, /submission_name: name/);
  assert.match(workspace, /媒体资源已上传，保存名称/);
  assert.match(workspace, /role="status" aria-live="polite"/);
  // 保存修改内容落媒体；上传媒体资源只做命名并记录到 publication_log。
  const saveContentStart = workspace.indexOf('async function saveContent()');
  const saveDraftStart = workspace.indexOf('async function saveDraft()');
  const inspectStart = workspace.indexOf('function openDelete(');
  assert.ok(saveContentStart > 0 && saveDraftStart > saveContentStart && inspectStart > saveDraftStart);
});

test('video uploads are published immediately and never enter review', async () => {
  const workspace = await readSource('extensions/content-editor-workbench/src/video-share-workspace.vue');
  const helper = await readSource('extensions/content-editor-workbench/src/video-share-cards.js');
  const module = await readSource('extensions/content-editor-workbench/src/module.vue');
  assert.match(workspace, /上传成功即发布，不需要审批/);
  assert.match(helper, /status: 'published',\s*\n\s*publication_state: 'published'/);
  assert.match(helper, /Media assets are published on upload/);
  assert.match(module, /媒体素材已取消审核/);
  assert.match(module, /status: 'published',\s*\n\s*publication_state: 'published'/);
});
