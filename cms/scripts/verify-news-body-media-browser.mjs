import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '../../website/node_modules/playwright/index.mjs';
const cms='http://127.0.0.1:8055';
const env=Object.fromEntries((await readFile(new URL('../.env.local', import.meta.url),'utf8')).split(/\r?\n/).flatMap(l=>{const m=l.match(/^([^#=]+)=(.*)$/);return m?[[m[1].trim(),m[2]]]:[]}));
const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:1920,height:1080}}); const request=page.context().request;
let token, articleId, a1, a2, original;
async function pixels(image) {
 return image.evaluate(async element => {
  await element.decode();
  const canvas=document.createElement('canvas'); canvas.width=64; canvas.height=64;
  const context=canvas.getContext('2d'); context.drawImage(element,0,0,64,64);
  return Array.from(context.getImageData(0,0,64,64).data).join(',');
 });
}
async function api(path,method='GET',body){const r=await request.fetch(cms+path,{method,headers:{authorization:'Bearer '+token,'content-type':'application/json'},...(body?{data:body}:{})}); if(!r.ok())throw Error(method+' '+path+' '+r.status()+' '+await r.text()); return r.status()===204?null:(await r.json()).data}
try{
 const login=await (await fetch(cms+'/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:env.ADMIN_EMAIL,password:env.ADMIN_PASSWORD})})).json(); token=login.data.access_token;
 const s1=await api('/items/media_assets/25'),s2=await api('/items/media_assets/26');
 async function clone(s,title){return api('/items/media_assets','POST',{file_id:s.file_id,original_file_name:s.original_file_name,mime_type:s.mime_type,byte_size:s.byte_size,width:s.width,height:s.height,aspect_ratio:s.aspect_ratio,usage_scope:'article',media_type:'image',placement_key:'news.article.body',page_key:'news',section_key:'article',alt_text:title,title,status:'draft',publication_state:'unpublished',enabled:true,copyright_status:'authorized',authorization_note:'临时正文媒体验收'})}
 a1=await clone(s1,'临时正文图一'); a2=await clone(s2,'临时正文图二');
 const slug='cms-body-media-'+Date.now();
 const created=await api('/items/articles','POST',{slug,category:'news',title:'正文媒体闭环验收',display_date:new Date().toISOString().slice(0,10),summary:'临时验收',body:'<p>正文媒体验收</p>',body_media:[{media_asset_id:String(a1.id),caption:'临时正文图一'}],media:[],status:'draft',publication_state:'unpublished'});
 articleId=created.id; original=created;
 await page.goto(cms+'/admin/login'); await page.getByRole('textbox',{name:'邮箱',exact:true}).fill(env.ADMIN_EMAIL); await page.getByRole('textbox',{name:'密码',exact:true}).fill(env.ADMIN_PASSWORD); await page.getByRole('button',{name:'登录',exact:true}).click(); await page.waitForURL(u=>!u.pathname.endsWith('/login'));
 await page.goto(cms+'/admin/ruijun-content-editor-workbench'); await page.getByRole('button',{name:'视频新闻',exact:true}).click(); await page.getByRole('button',{name:'动态新闻内容',exact:true}).click(); await page.getByRole('button',{name:/正文媒体闭环验收/}).click(); await page.getByRole('button',{name:'打开实时预览',exact:true}).click(); await page.getByLabel('新闻画布').selectOption('detail');
 const frame=page.frameLocator('iframe'); const img=frame.locator('img[data-cms-preview-placement-key="news.article.body"]'); await img.waitFor({state:'attached'});
 await page.getByTitle('选择图片或视频',{exact:true}).click(); await frame.locator('html[data-cms-preview-edit-mode="true"][data-cms-preview-edit-tool="media"]').waitFor({state:'attached'}); await img.click();
 const panel=page.getByRole('complementary',{name:'选中元素属性'}); await panel.waitFor();
 assert.match(await panel.innerText(),new RegExp('articles/'+articleId+' · body_media\\.0\\.media_asset_id'));
 const opts=await panel.getByLabel(/^媒体替换/).locator('option').evaluateAll(os=>os.map(o=>o.value)); assert.ok(opts.includes(String(a1.id))); assert.ok(opts.includes(String(a2.id)));
 const beforePixels=await pixels(img);
 await panel.getByLabel(/^媒体替换/).selectOption(String(a2.id)); await page.waitForTimeout(700);
 assert.match(await img.getAttribute('src'),new RegExp('/api/preview/media/'+a2.id));
 const afterPixels=await pixels(img);
 assert.notEqual(afterPixels,beforePixels,'different images must render different pixels');
 const save=page.waitForResponse(r=>r.request().method()==='PATCH'&&new URL(r.url()).pathname==='/items/articles/'+articleId); await page.getByRole('button',{name:'保存草稿',exact:true}).click(); assert.ok((await save).ok());
 let saved=await api('/items/articles/'+articleId+'?fields=id,body_media'); assert.equal(String(saved.body_media[0].media_asset_id),String(a2.id));
 await page.goto(cms+'/admin/ruijun-content-editor-workbench'); await page.getByRole('button',{name:'视频新闻',exact:true}).click(); await page.getByRole('button',{name:'动态新闻内容',exact:true}).click(); await page.getByRole('button',{name:/正文媒体闭环验收/}).click(); await page.getByRole('button',{name:'打开实时预览',exact:true}).click(); await page.getByLabel('新闻画布').selectOption('detail'); const re=page.frameLocator('iframe').locator('img[data-cms-preview-placement-key="news.article.body"]'); await re.waitFor({state:'attached'}); assert.match(await re.getAttribute('src'),new RegExp('/api/preview/media/'+a2.id));
 assert.equal(await pixels(re),afterPixels,'reloaded image must retain replacement pixels');
 await page.getByTitle('选择图片或视频',{exact:true}).click();
 await frame.locator('html[data-cms-preview-edit-mode="true"][data-cms-preview-edit-tool="media"]').waitFor({state:'attached'});
 await re.click();
 await panel.getByLabel(/^媒体替换/).selectOption(String(a1.id));
 await page.waitForTimeout(700);
 assert.equal(await pixels(re),beforePixels,'canvas restoration must restore original pixels');
 const restoreSave=page.waitForResponse(r=>r.request().method()==='PATCH'&&new URL(r.url()).pathname==='/items/articles/'+articleId);
 await page.getByRole('button',{name:'保存草稿',exact:true}).click();
 assert.ok((await restoreSave).ok());
 saved=await api('/items/articles/'+articleId+'?fields=id,body_media');
 assert.deepEqual(saved.body_media,original.body_media);
 await page.goto(cms+'/admin/ruijun-content-editor-workbench');
 await page.getByRole('button',{name:'视频新闻',exact:true}).click();
 await page.getByRole('button',{name:'动态新闻内容',exact:true}).click();
 await page.getByRole('button',{name:/正文媒体闭环验收/}).click();
 await page.getByRole('button',{name:'打开实时预览',exact:true}).click();
 await page.getByLabel('新闻画布').selectOption('detail');
 await re.waitFor({state:'attached'});
 assert.equal(await pixels(re),beforePixels,'restored image must survive a fresh workbench load');
 console.log(JSON.stringify({articleId,firstAsset:a1.id,secondAsset:a2.id,savedTo:'articles/'+articleId+'.body_media.0.media_asset_id',restored:true,reloadPixelsVerified:true,canvasRestorationVerified:true}));
} finally {
 const failures=[];
 for(const [collection,id] of [['articles',articleId],['media_assets',a1?.id],['media_assets',a2?.id]]) {
  if(!id) continue;
  try {
   await api('/items/'+collection+'/'+id,'DELETE');
   const remaining=await api('/items/'+collection+'?filter[id][_eq]='+id+'&fields=id');
   assert.deepEqual(remaining,[],'temporary record must be absent after deletion');
  } catch(error) { failures.push(error); }
 }
 await browser.close();
 if(failures.length) throw new AggregateError(failures,'Temporary test data cleanup failed');
 console.log(JSON.stringify({cleanupVerified:true}));
}
