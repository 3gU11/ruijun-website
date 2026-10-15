import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { chromium } from '../../website/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'node:url';

const env = Object.fromEntries((await readFile(new URL('../.env.local', import.meta.url), 'utf8')).split(/\r?\n/).flatMap(line => {
  const match = line.match(/^([^#=]+)=(.*)$/); return match ? [[match[1].trim(), match[2]]] : [];
}));
let token;
async function api(path, method = 'GET', body) {
  const response = await fetch(`http://127.0.0.1:8055${path}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify((await response.json()).errors?.map(e => ({ message: e.message, code: e.extensions?.code })))}`);
  return response.status === 204 ? null : (await response.json()).data;
}
const scenarios = {
  home: { pageId: '1', sectionKey: 'advanced-manufacturing', assetId: '90', placement: 'home.reason.background', area: null, entry: '三大特点', selector: '.reason-scene[data-cms-preview-key="advanced-manufacturing"] img[data-cms-preview-placement-key="home.reason.background"]', click: '.reason-scene[data-cms-preview-key="advanced-manufacturing"] .photo-copy h2' },
  timeline: { pageId: '2', sectionKey: 'history', assetId: '87', placement: 'about.timeline.background', area: '关于瑞钧', entry: '发展历程标题', selector: '#history[data-cms-preview-placement-key="about.timeline.background"]', click: '#history .history-viewport' },
  about: { pageId: '2', sectionKey: 'hero', assetId: '189', placement: 'about.hero.background', area: '关于瑞钧', entry: '关于瑞钧首屏', selector: '.about-story-backdrop', click: '#about-title' }
};
const scenarioName = process.argv[2] || 'home';
scenarios['manufacturing-hero'] = { pageId:'8', sectionKey:'hero', assetId:'55', placement:'manufacturing.hero.image', pageKey:'manufacturing', area:'先进制造', entry:'制造首屏', role:'hero-building', selector:'img.psd-layer--hero-building', click:'img.psd-layer--hero-building' };
scenarios['manufacturing-cnc'] = { pageId:'8', sectionKey:'precision-machining', assetId:'56', placement:'manufacturing.layer.image', pageKey:'manufacturing', area:'先进制造', entry:'CNC车间', role:'cnc-main', selector:'img.psd-layer--cnc-main', click:'img.psd-layer--cnc-main' };
scenarios['manufacturing-equipment'] = { pageId:'8', sectionKey:'core-equipment', assetId:'50', placement:'manufacturing.equipment.image', pageKey:'manufacturing', area:'先进制造', entry:'生产核心设备', role:'equipment-1', selector:'img.psd-layer--equipment-1', click:'button.equipment-preview-trigger' };
scenarios['hero-poster'] = {pageId:'1',sectionKey:'hero',assetId:'48',normalizeSource:true,placement:'home.hero.poster',pageKey:'home',area:null,entry:'首页视频',role:'poster',selector:'.cms-hero-image-slots figure:first-child img',click:'.cms-hero-image-slots figure:first-child img'};
scenarios['hero-still'] = {...scenarios['hero-poster'],role:'end-frame',selector:'.cms-hero-image-slots figure:last-child img',click:'.cms-hero-image-slots figure:last-child img'};
scenarios['hero-video'] = {...scenarios['hero-poster'],assetId:'49',normalizeSource:false,placement:'home.hero.video',role:'video',scalar:'hero_video_asset_id',selector:'.hero-video',click:'.hero-video'};
scenarios['timeline-icon'] = { ...scenarios.timeline, assetId: '88', role: 'icon', placement: 'about.timeline.icon', selector: '#history .history-wheel-cursor img', click: '#history .history-wheel-cursor img' };
scenarios['home-timeline'] = {...scenarios.timeline,pageId:'1',area:null,entry:'时间轴',click:'#history-title'};
scenarios['home-timeline-icon'] = {...scenarios['timeline-icon'],pageId:'1',area:null,entry:'时间轴'};
scenarios.service = { pageId: '3', sectionKey: 'hero', assetId: '86', placement: 'service.hero.image', area: '服务支持', entry: '服务支持首屏', selector: '.psd-service-hero', click: '#service-title' };
scenarios['about-machine'] = { ...scenarios.about, assetId: null, pageKey: 'about', role: 'foreground', placement: 'about.hero.foreground', selector: '.cms-hidden-media-preview img', click: '.cms-hidden-media-preview img' };
for (const [name, sectionKey, entry, role, placement, selector] of [
 ['factory','factory','厂区风貌','factory-1','about.gallery.image','.factory-grid img'],
 ['partners','partners','合作品牌','partner-1','about.partner.image','.partners-gallery img'],
 ['domestic','clients-domestic','国内客户','domestic-1','about.client.image','[data-cms-preview-key="clients-domestic"] .client-row img'],
 ['global','clients-global','国外客户','global-1','about.client.image','[data-cms-preview-key="clients-global"] .client-row img'],
]) scenarios[name] = {...scenarios.about, sectionKey, entry, role, placement, selector, click:selector, assetId:null, pageKey:'about'};
for (const [name, sectionKey, entry, role, placement, selector] of [
 ['service-action','support-actions','服务入口','action-1','service.action.icon','.psd-support-action-icon img'],
 ['service-region','office-directory','国内直属办事处','office-1','service.office.image','.psd-office-region-photo'],
 ['service-map','office-directory','国内直属办事处','office-map-1','service.office.map','img[data-cms-preview-media-role="map"]'],
]) scenarios[name] = {...scenarios.service, sectionKey, entry, role, placement, selector, click:selector, assetId:null, pageKey:'service'};
scenarios.leadership = { ...scenarios.home, sectionKey: 'industry-leadership', assetId: '91', selector: scenarios.home.selector.replaceAll('advanced-manufacturing', 'industry-leadership'), click: scenarios.home.click.replaceAll('advanced-manufacturing', 'industry-leadership') };
scenarios.machine = { ...scenarios.home, sectionKey: 'performance', assetId: '89', role: 'foreground', placement: 'home.reason.machine', selector: '.reason-scene[data-cms-preview-key="performance"] img.performance-machine', click: '.reason-scene[data-cms-preview-key="performance"] img.performance-machine' };
for (const key of ['performance', 'advanced-manufacturing', 'industry-leadership']) {
  const selector = `.reason-tabs [data-cms-preview-key="${key}"] img`;
  scenarios[`icon-${key}`] = { ...scenarios.home, sectionKey: key, assetId: null, role: 'icon', placement: 'home.reason.icon', selector, click: selector };
}
const independent = scenarioName === 'independent';
const scenario = independent ? scenarios.home : scenarios[scenarioName];
assert.ok(scenario, 'Unknown verification scenario');
const { pageId, sectionKey } = scenario;
let assetId = scenario.assetId;
const mediaRole = scenario.role || 'background';
token = (await api('/auth/login', 'POST', { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })).access_token;
if (!assetId) {
  const candidates = await api(`/items/media_assets?filter[placement_key][_eq]=${scenario.placement}&filter[section_key][_eq]=${sectionKey}&filter[page_key][_eq]=${scenario.pageKey || 'home'}&filter[status][_eq]=draft&limit=1`);
  assert.ok(candidates[0]?.id, 'No governed draft asset for this placement');
  assetId = String(candidates[0].id);
}
const dedicated = independent ? (await api(`/items/homepage_sections?filter[section_key][_eq]=${sectionKey}&filter[page_key][_eq]=home`))[0] : null;
if (independent) assert.ok(dedicated?.id);
const pagePath = independent ? `/items/homepage_sections/${dedicated.id}` : `/items/pages/${pageId}`;
const original = await api(pagePath);
const parentPageBaseline = independent ? await api(`/items/pages/${pageId}`) : null;
assert.equal(original.status, 'draft');
assert.equal(original.publication_state, 'unpublished');
const sectionFor = sections => sections.find(s => s.id === sectionKey);
const originalSections = independent ? [{ ...original, id: sectionKey }] : original.sections;
assert.ok(sectionFor(originalSections));
const payloadFor = sections => independent ? { media: sectionFor(sections).media } : { sections };
let source = await api(`/items/media_assets/${assetId}`);
assert.equal(source.placement_key, scenario.placement);
const differentImage = process.argv.includes('--different-image');
const alternateId = scenario.placement === 'home.hero.video' ? '133' : String(assetId) === '91' ? '90' : '91';
const alternate = differentImage ? await api(`/items/media_assets/${alternateId}`) : source;
if (differentImage) assert.notEqual(alternate.file_id, source.file_id);
const temporarySource = { ...source, ...Object.fromEntries(['file_id', 'original_file_name', 'mime_type', 'byte_size', 'width', 'height', 'copyright_status', 'authorization_note'].map(key => [key, alternate[key]])) };
const fields = ['file_id', 'original_file_name', 'mime_type', 'byte_size', 'usage_scope', 'media_type', 'width', 'height', 'placement_key', 'page_key', 'section_key', 'alt_text', 'copyright_status', 'authorization_note', 'enabled', 'aspect_ratio', 'poster_asset_id', 'duration_seconds', 'transcript'];
let temporaryId, referenceId, browser, page, mutated = false, openCanvasForRestore, image, verifyVideoPlaybackForRestore;
const evidenceDir = new URL(`../../output/playwright/media-binding/${scenarioName}/`, import.meta.url);
await mkdir(evidenceDir, { recursive: true });
await writeFile(new URL('home-sections-backup.json', evidenceDir), JSON.stringify(originalSections, null, 2));
try {
  if (scenario.normalizeSource) {
    source = await api('/items/media_assets','POST',{...Object.fromEntries(fields.filter(f => source[f] != null).map(f => [f,source[f]])),title:'临时受管媒体验收参照',page_key:scenario.pageKey,section_key:sectionKey,status:'draft',publication_state:'unpublished'});
    assetId=referenceId=String(source.id);
  }
  const temporary = await api('/items/media_assets', 'POST', { ...Object.fromEntries(fields.filter(f => temporarySource[f] != null).map(f => [f, temporarySource[f]])), ...(scenario.normalizeSource ? {page_key:scenario.pageKey,section_key:sectionKey} : {}), ...(scenario.placement === 'home.hero.video' ? { media_type:'video', mime_type:'video/mp4', autoplay:true, muted:true, loop:true, poster_asset_id:'48' } : {}), title: '临时浏览器媒体绑定验收', status: 'draft', publication_state: 'unpublished' });
  temporaryId = String(temporary.id);
  const sections = structuredClone(originalSections);
  const section = sectionFor(sections);
  section.media = (section.media || []).filter(m => m.role !== mediaRole);
  section.media.push({ role: mediaRole, media_asset_id: temporaryId });
  if (scenario.scalar) { section[scenario.scalar]=temporaryId; section.media=section.media.filter(m=>m.role!==mediaRole); }
  await api(pagePath, 'PATCH', payloadFor(sections));
  mutated = true;
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://127.0.0.1:8055/admin/login');
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(env.ADMIN_EMAIL);
  await page.getByRole('textbox', { name: '密码', exact: true }).fill(env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL(url => !url.pathname.endsWith('/login'));
  async function openCanvas() {
    await page.goto('http://127.0.0.1:8055/admin/ruijun-content-editor-workbench');
    if (scenario.area) await page.getByRole('button', { name: scenario.area, exact: true }).click();
    await page.getByRole('button', { name: scenario.entry, exact: true }).click();
    if (independent) {
      await page.getByRole('button', { name: `编辑独立区块：${original.title || sectionKey}`, exact: true }).click();
    } else {
      await page.locator(`.section-card[data-section-key="${sectionKey}"] input`).first().click();
      await page.getByRole('button', { name: '打开实时预览', exact: true }).click();
    }
    return page.frameLocator('iframe').locator(scenario.selector).first();
  }
  openCanvasForRestore = openCanvas;
  image = await openCanvas();
  await page.evaluate(() => { window.__mediaSelections = []; window.addEventListener('message', e => { if (String(e.data?.type).includes('edit-request')) window.__mediaSelections.push(e.data); }); });
  await image.waitFor({ state: 'attached' });
  console.log(JSON.stringify({ binding: await image.evaluate(node => Object.fromEntries([...node.attributes].filter(a => a.name.startsWith('data-cms')).map(a => [a.name, a.value]))) }));
  const editMode = page.getByRole('button', { name: '编辑模式', exact: true });
  if (await editMode.count()) await editMode.click();
  await page.getByTitle('选择图片或视频', { exact: true }).click();
  await page.frameLocator('iframe').locator('html[data-cms-preview-edit-mode="true"][data-cms-preview-edit-tool="media"]').waitFor({ state: 'attached' });
  console.log(JSON.stringify({ runtime: await image.evaluate(node => ({ mode: document.documentElement.dataset.cmsPreviewEditMode, pointer: getComputedStyle(node).pointerEvents, parentZ: getComputedStyle(node.parentElement).zIndex, parentPointer: getComputedStyle(node.parentElement).pointerEvents })) }));
  await page.frameLocator('iframe').locator(`${scenario.selector}[data-cms-preview-editable="true"]`).first().waitFor({ state: 'attached' });
  await image.scrollIntoViewIfNeeded();
  if (pageId === '1' && ['performance','advanced-manufacturing','industry-leadership'].includes(sectionKey)) await page.frameLocator('iframe').locator(`.reason-tabs a[href="#reason-${sectionKey}"][aria-current="true"]`).waitFor();
  console.log(JSON.stringify({ geometry: await image.evaluate(node => { const r=node.getBoundingClientRect(); return { rect: r.toJSON(), hit: document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML.slice(0,350), editable: node.dataset.cmsPreviewEditable }; }) }));
  // Click the actual painted overlay; do not dispatch synthetic selection messages.
  await page.frameLocator('iframe').locator(scenario.click).first().click();
  console.log(JSON.stringify({ afterClick: await page.evaluate(() => ({ selections: window.__mediaSelections, panel: document.querySelector('.visual-property-panel')?.textContent, mode: document.querySelector('.visual-mode-button')?.textContent })) }));
  const panel = page.getByRole('complementary', { name: '选中元素属性' });
  await panel.waitFor();
  async function imagePixels() {
    return image.evaluate(async node => {
      if (!(node instanceof HTMLImageElement)) throw new Error('Pixel check requires an image element');
      for (let attempt = 0; ; attempt++) {
        try { await node.decode(); break; }
        catch (error) {
          if (attempt >= 20) throw error;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32;
      canvas.getContext('2d').drawImage(node, 0, 0, 32, 32);
      return canvas.toDataURL();
    });
  }
  const canPixelCheck = scenario.elementType !== 'video' && !scenario.scalar;
  async function verifyVideoPlayback(expectedId) {
    await image.evaluate(async (node, id) => {
      if (!(node instanceof HTMLVideoElement)) throw new Error('Expected video element');
      const expected = `/api/preview/media/${id}`;
      const deadline = Date.now() + 15000;
      while (node.readyState < 2 || !node.currentSrc.includes(expected)) {
        if (node.error) throw new Error(`Video decode failed: ${node.error.code}`);
        if (Date.now() >= deadline) throw new Error('Video frame did not decode');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (!node.videoWidth || !node.videoHeight) throw new Error('Missing decoded video dimensions');
      node.muted = true;
      await node.play();
      const initial = node.currentTime;
      await new Promise(resolve => setTimeout(resolve, 500));
      if (node.paused || node.currentTime === initial) throw new Error('Video playback did not advance');
    }, expectedId);
  }
  verifyVideoPlaybackForRestore = verifyVideoPlayback;
  if (!canPixelCheck) await verifyVideoPlayback(temporaryId);
  const beforePixels = differentImage && canPixelCheck ? await imagePixels() : null;
  assert.ok((await panel.innerText()).includes(independent ? `homepage_sections/${original.id}` : `pages/${pageId}`));
  await panel.getByLabel(/^媒体替换/).selectOption(assetId);
  await page.waitForFunction(() => !document.querySelector('.visual-save-button')?.disabled);
  await image.locator(`xpath=self::*[contains(@src, '/api/preview/media/${assetId}') or contains(@style, '/api/preview/media/${assetId}')]`).waitFor({ state: 'attached' });
  const afterPixels = differentImage && canPixelCheck ? await imagePixels() : null;
  if (differentImage && canPixelCheck) assert.notEqual(afterPixels, beforePixels, 'Decoded image pixels must change');
  if (!canPixelCheck) await verifyVideoPlayback(assetId);
  const saveResponse = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname === pagePath);
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  assert.ok((await saveResponse).ok());
  await page.waitForFunction(() => document.querySelector('.visual-save-button')?.disabled === true);
  const saved = await api(pagePath);
  const savedSection = independent ? saved : sectionFor(saved.sections);
  assert.equal(String(scenario.scalar ? savedSection[scenario.scalar] : savedSection.media.find(m => m.role === mediaRole).media_asset_id), assetId);
  if (independent) assert.deepEqual(await api(`/items/pages/${pageId}`), parentPageBaseline);
  image = await openCanvas();
  await image.waitFor({ state: 'attached' });
  assert.ok(((await image.getAttribute('src')) || (await image.getAttribute('style')) || '').includes(`/api/preview/media/${assetId}`));
  if (differentImage && canPixelCheck) assert.equal(await imagePixels(), afterPixels, 'Reload must preserve decoded image pixels');
  if (!canPixelCheck) await verifyVideoPlayback(assetId);
  await page.screenshot({ path: new URL('home-background-reloaded.png', evidenceDir).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
  console.log(JSON.stringify({ check: `${scenarioName}-background-browser`, selected: true, replaced: true, saved: true, authenticatedReadback: true, reloaded: true, differentPixelsVerified: differentImage && canPixelCheck, videoPlaybackVerified: !canPixelCheck, differentVideoFilesVerified: differentImage && !canPixelCheck }));
} catch (error) {
  if (page) {
    await page.screenshot({ path: fileURLToPath(new URL('home-background-failure.png', evidenceDir)), fullPage: true });
    await writeFile(new URL('home-background-failure.txt', evidenceDir), await page.locator('body').innerText());
  }
  throw error;
} finally {
  let dataRestored = !mutated;
  try {
  if (mutated) {
    await api(pagePath, 'PATCH', payloadFor(originalSections));
    const restored = await api(pagePath);
    assert.deepEqual(independent ? restored.media : restored.sections, independent ? original.media : original.sections);
    dataRestored = true;
    if (process.argv.includes('--fail-restoration-check')) throw new Error('Injected restoration UI check failure');
    if (scenario.placement === 'home.hero.video') {
      assert.equal(String(sectionFor(restored.sections).hero_video_asset_id || ''), String(sectionFor(originalSections).hero_video_asset_id || ''));
      if (page) {
        image = await openCanvasForRestore();
        await image.waitFor({ state: 'attached' });
        const originalVideoId = String(sectionFor(originalSections).hero_video_asset_id || '');
        if (originalVideoId) await verifyVideoPlaybackForRestore(originalVideoId);
        else {
          await image.evaluate(async node => {
            if (!(node instanceof HTMLVideoElement)) throw new Error('Expected restored homepage video element');
            const expected = '/assets/home-intro-raw.mp4';
            const deadline = Date.now() + 15000;
            while (node.readyState < 2 || !node.currentSrc.includes(expected)) {
              if (node.error) throw new Error(`Restored fallback video decode failed: ${node.error.code}`);
              if (Date.now() >= deadline) throw new Error('Restored fallback video did not decode');
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            if (!node.videoWidth || !node.videoHeight) throw new Error('Restored fallback video has no decoded dimensions');
            node.muted = true;
            await node.play();
            const initial = node.currentTime;
            await new Promise(resolve => setTimeout(resolve, 500));
            if (node.paused || node.currentTime === initial) throw new Error('Restored fallback video playback did not advance');
          });
        }
      }
    }
  }
  } finally {
  try {
  if (temporaryId && dataRestored) {
    await api(`/items/media_assets/${temporaryId}`, 'DELETE');
    assert.deepEqual(await api(`/items/media_assets?filter[id][_eq]=${temporaryId}`), [], 'Temporary media deletion must be read back');
  }
  if (referenceId && dataRestored) {
    await api(`/items/media_assets/${referenceId}`, 'DELETE');
    assert.deepEqual(await api(`/items/media_assets?filter[id][_eq]=${referenceId}`), []);
  }
  console.log(JSON.stringify({ cleanupVerified: dataRestored, temporaryId, referenceId }));
  } finally {
    await browser?.close();
  }
  }
  console.log(JSON.stringify({ restored: mutated, restoredVideoPlaybackVerified: scenario.placement === 'home.hero.video' && mutated, temporaryMediaRemoved: Boolean(temporaryId) }));
}
