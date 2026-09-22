import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Nuxt service page consumes the public service resource and location APIs without CMS browser access', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');

  assert.match(source, /useFetch\('\/api\/public\/v1\/service-resources'/);
  assert.match(source, /useFetch\('\/api\/public\/v1\/service-locations'/);
  assert.match(source, /SERVICE RESOURCES/);
  assert.match(source, /SERVICE LOCATIONS/);
  assert.match(source, /function supportPhoneValue\(value: unknown\)/);
  assert.match(source, /const supportPhone = computed\(\(\) => supportPhoneValue\(serviceConfig\.value\?\.supportPhone\)\)/);
  assert.match(source, /class="service-human-support"/);
  assert.match(source, /:href="`tel:\$\{supportPhone\}`"/);
  assert.match(source, /shouldEnableServiceEntries/);
  assert.match(source, /const repairSystemAvailable = computed\(\(\) => shouldEnableServiceEntries\(serviceConfig\.value\?\.available\)\)/);
  assert.match(source, /repairSystemAvailable\.value \? resolveServiceEntry/);
  assert.match(source, /createServiceEntryClick/);
  assert.match(source, /class="service-exit-dialog"/);
  assert.match(source, /即将进入瑞钧售后服务系统/);
  assert.match(source, /\/api\/public\/v1\/service-entry-clicks/);
  assert.match(source, /window\.open\(pendingExit\.value\.url, '_blank', 'noopener,noreferrer'\)/);
  assert.match(source, /service-exit-dialog button:not\(\.cancel\)/);
  assert.match(source, /const selectedSupportModel = ref<string \| null>\(null\)/);
  assert.match(source, /function selectSupportModel\(model: string\)/);
  assert.match(source, /id="support-actions" class="psd-action-panel cms-positioned"/);
  assert.doesNotMatch(source, /v-if="selectedSupportModel" id="support-actions"/);
  assert.match(source, /@click="openModelServiceAction\(action\)"/);
  assert.match(source, /:aria-pressed="selectedSupportModel === model\.label"/);
  assert.doesNotMatch(source, /CMS_SERVICE_(?:RESOURCES|LOCATIONS)_URL/);
});

test('service office visual binding edits the raw service scope without duplicating the city prefix', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');
  assert.match(source, /return \{ binding: serviceLocationRecordBinding\(location\), sourceKey:[\s\S]*city: store,[\s\S]*address,[\s\S]*manager:/);
  assert.match(source, /\{\{ office\.city \? `\$\{office\.city\}：` : '' \}\}<span :data-cms-preview-field-path="office\.binding\?\.address">\{\{ office\.address \}\}<\/span>/);
});

test('service office directory binds each configured region title to its page-section item', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');
  assert.match(source, /binding: serviceOfficeBinding\(index, officeIndex\)/);
  assert.match(source, /<section class="psd-office-directory"[^>]*data-cms-preview-key="office-directory"/);
  assert.match(source, /<h3[^>]*:data-cms-preview-field-path="region\.titleFieldPath \|\| region\.offices\[0\]\?\.binding\?\.regionTitle"[^>]*>\{\{ region\.name \}\}<\/h3>/);
});

test('service office images and maps declare their governed media placements', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');
  assert.match(source, /mediaSlot: String\(region\.media_role \|\| `office-\$\{index \+ 1\}`\)/);
  assert.match(source, /mapMediaSlot: String\(region\.map_media_role \|\| `office-map-\$\{index \+ 1\}`\)/);
  assert.match(source, /:data-cms-preview-placement-key="region\.imageFieldPath \? 'service\.office\.image' : undefined"/);
  assert.match(source, /:data-cms-preview-media-slot="region\.mediaSlot"/);
  assert.match(source, /:data-cms-preview-placement-key="region\.mapFieldPath \? 'service\.office\.map' : undefined"/);
  assert.match(source, /:data-cms-preview-media-slot="region\.mapMediaSlot"/);
});

test('service office contact fields use the configured page-item address manager and phone paths', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');
  assert.match(source, /<span :data-cms-preview-field-path="office\.binding\?\.address">\{\{ office\.address \}\}<\/span>/);
  assert.match(source, /<span v-if="office\.manager" :data-cms-preview-field-path="office\.binding\?\.manager">\{\{ office\.manager \}\}<\/span>/);
  assert.match(source, /<span :data-cms-preview-field-path="office\.binding\?\.phone">\{\{ office\.phone \}\}<\/span>/);
});

test('empty service office phone keeps an edit-only direct binding without changing the public page', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');
  assert.match(source, /class="cms-office-phone-empty" :data-cms-preview-field-path="office\.binding\?\.phone" data-cms-preview-editable="true">未填写联系电话<\/span>/);
  assert.match(source, /\.cms-office-phone-empty\{display:none\}/);
  assert.match(source, /html\[data-cms-preview-edit-mode="true"\] \.cms-office-phone-empty\{display:inline-flex/);
});

test('service page resolves every visual section through its owning pages record', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');
  assert.match(source, /import \{ resolvePageSection \} from '~\/shared\/page-sections\.mjs'/);
  assert.match(source, /resolvePageSection\(servicePageContent\.value, id, fallback\)/);
  for (const section of ['hero', 'support', 'support-models', 'support-actions', 'office-directory']) {
    assert.match(source, new RegExp(`serviceSection\\('${section}'`));
  }
});

test('service page binds media replacements to their actual rendered source paths', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');
  assert.match(source, /function sectionMediaAsset\(/);
  assert.match(source, /const binding = serviceSectionMediaBinding\(entry, resolvedIndex\);/);
  assert.match(source, /fieldPath: binding\?\.fieldPath \|\| fallbackFieldPath/);
  assert.match(source, /heroBackground\.fieldPath/);
  assert.match(source, /data-cms-preview-placement-key="service\.hero\.image"/);
  assert.match(source, /:data-cms-preview-field-path="model\.imageFieldPath"/);
  assert.match(source, /:data-cms-preview-field-path="action\.imageFieldPath"/);
  assert.match(source, /:data-cms-preview-media-slot="action\.mediaSlot"/);
  assert.match(source, /data-cms-preview-placement-key="service\.action\.icon"/);
  assert.match(source, /:data-cms-preview-field-path="region\.imageFieldPath \|\| region\.offices/);
});

test('service repeated copy keeps the exact source field selected by the renderer', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');
  assert.match(source, /fieldPath: field \? `items\.\$\{index\}\.\$\{field\}`/);
  assert.match(source, /:data-cms-preview-field-path="heroItems\[0\]\?\.fieldPath"[^>]*>\{\{ heroItems\[0\]\?\.value \}\}<\/span>/);
  assert.match(source, /<li v-for="item in heroItems"[^>]*:data-cms-preview-field-path="item\.fieldPath"[^>]*>\{\{ item\.value \}\}<\/li>/);
  assert.match(source, /:data-cms-preview-field-path="item\.fieldPath"/);
  assert.match(source, /:data-cms-preview-field-path="model\.labelFieldPath"/);
  assert.match(source, /:data-cms-preview-field-path="action\.titleFieldPath"/);
});

test('service model cards bind each visible name to its exact repeated item field', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');

  assert.match(source, /const presentationKey = typeof card\.label === 'string' && card\.label\.trim\(\) \? 'label' : 'title'/);
  assert.match(source, /labelFieldPath: `items\.\$\{index\}\.\$\{presentationKey\}`/);
  assert.match(source, /<button v-for="model in psdSupportModels"[\s\S]*?<span class="cms-styled-text"[^>]*:data-cms-preview-field-path="model\.labelFieldPath"[^>]*>\{\{ model\.label \}\}<\/span>/);
});

test('service model cards render each item\'s bounded visual presentation on its own clickable card', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');

  assert.match(source, /presentation: card, presentationKey, presentationFieldPath: `items\.\$\{index\}\.field_presentation\.\$\{presentationKey\}`/);
  assert.match(source, /<button v-for="model in psdSupportModels"[^>]*class="cms-positioned-item"[^>]*v-bind="sectionPresentationAttributes\(model\.presentation\)"/);
});

test('service action cards bind each visible title to its exact repeated item field', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');

  assert.match(source, /const titlePresentationKey = typeof card\.title === 'string' && card\.title\.trim\(\) \? 'title' : 'label'/);
  assert.match(source, /titleFieldPath: `items\.\$\{index\}\.\$\{titlePresentationKey\}`/);
  assert.match(source, /<button v-for="\(action, index\) in psdSupportActions\.slice\(0, 8\)"[^>]*@click="openModelServiceAction\(action\)">\s*<strong class="cms-styled-text"[^>]*:data-cms-preview-field-path="action\.titleFieldPath"[^>]*>\{\{ action\.title \}\}<\/strong>/);
});

test('service action cards render each item\'s bounded visual presentation on the exact clickable card', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');

  assert.match(source, /presentation: card/);
  assert.match(source, /<button v-for="\(action, index\) in psdSupportActions\.slice\(0, 8\)"[^>]*v-bind="sectionPresentationAttributes\(action\.presentation\)"[^>]*@click="openModelServiceAction\(action\)">/);
});

test('service hero title keeps an independent page-section binding beside the emphasis and body copy', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');

  assert.match(source, /<section class="psd-service-hero"[\s\S]*?data-cms-preview-key="hero"/);
  assert.match(source, /<h1 id="service-title"[^>]*class="cms-styled-text"[^>]*data-cms-preview-field="title"[^>]*data-cms-preview-field-path="title"[^>]*>\{\{ sectionText\(heroSection, 'title', '售后服务'\) \}\} <em[^>]*data-cms-preview-field="description"[^>]*data-cms-preview-field-path="description"/);
  assert.match(source, /<p class="psd-service-statement"[^>]*data-cms-preview-field="body"[^>]*data-cms-preview-field-path="body"[^>]*>/);
});

test('service hero default background remains a governed replaceable canvas slot', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');

  assert.match(source, /sectionMediaAsset\(heroSection\.value, 'background', '\/assets\/service-library-hero-v4\.jpg', 'media\.0'\)/);
  assert.match(source, /<section class="psd-service-hero"[^>]*data-cms-preview-allow-default="true"[^>]*data-cms-preview-key="hero"/);
  assert.match(source, /<section class="psd-service-hero"[^>]*data-cms-preview-media-slot="background"/);
});

test('service hero emphasis retains its own direct field path inside the title element', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');

  assert.match(source, /<h1 id="service-title"[\s\S]*?data-cms-preview-field-path="title"[^>]*>[\s\S]*?<em[^>]*data-cms-preview-field="description"[^>]*data-cms-preview-field-path="description"[^>]*>\{\{ sectionText\(heroSection, 'description', '快人一步'\) \}\}<\/em><\/h1>/);
  assert.doesNotMatch(source, /<em[^>]+data-cms-preview-field-path="title"/);
});

test('service hero statement keeps a standalone body binding outside its title composition', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');

  assert.match(source, /<p class="psd-service-statement"[^>]*data-cms-preview-field="body"[^>]*data-cms-preview-field-path="body"[^>]*>\{\{ sectionText\(heroSection, 'body', '在线报单、进度追踪、专人支持，全程透明可查'\) \}\}<\/p>/);
  assert.doesNotMatch(source, /psd-service-statement[^>]+data-cms-preview-field-path="title"/);
});

test('service hero CTA keeps its button copy bound to the independent label field', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');

  assert.match(source, /<button type="button"[^>]*data-cms-preview-field="label"[^>]*data-cms-preview-field-path="label"[^>]*aria-controls="ruijun-support"[^>]*@click="scrollToSupport"[^>]*>\{\{ sectionText\(heroSection, 'label', '在线支持'\) \}\}/);
  assert.doesNotMatch(source, /<button[^>]+data-cms-preview-field-path="(?:title|body|description)"[^>]*aria-controls="ruijun-support"/);
});

test('service support heading copy uses its own rendered page-section body field', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');

  assert.match(source, /<section id="ruijun-support"[^>]*data-cms-preview-key="support"/);
  assert.match(source, /<p[^>]*data-cms-preview-field="body"[^>]*data-cms-preview-field-path="body"[^>]*>\{\{ sectionText\(supportSection, 'body', '需要协助 从这里开始'\) \}\}<\/p>/);
  assert.doesNotMatch(source, /<section id="ruijun-support"[\s\S]*?<p[^>]+data-cms-preview-field-path="title"/);
});

test('service support search CTA binds its form button copy without sharing the heading body', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');

  assert.match(source, /<form class="psd-support-search" @submit\.prevent="openAssistant\(question \|\| '我需要服务支持'\)">[\s\S]*?<button type="submit"[^>]*data-cms-preview-field="label"[^>]*data-cms-preview-field-path="label"[^>]*>\{\{ sectionText\(supportSection, 'label', '咨询 AI'\) \}\}/);
  assert.doesNotMatch(source, /<form class="psd-support-search"[\s\S]*?<button[^>]+data-cms-preview-field-path="body"/);
});

test('service support search placeholder exposes its rendered description as a canvas field', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');

  assert.match(source, /<input id="service-question"[^>]*data-cms-preview-field-path="description"[^>]*:placeholder="sectionText\(supportSection, 'description', '输入设备型号、故障现象、维修进度或保修问题'\)"/);
});

test('service support copy keeps independent field presentation controls on the real visible elements', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');

  assert.match(source, /<h2 id="support-title"[^>]*v-bind="fieldPresentationAttributes\(supportSection, 'title'\)"[^>]*data-cms-preview-position-field-path="field_presentation\.title"/);
  assert.match(source, /<p[^>]*v-bind="fieldPresentationAttributes\(supportSection, 'body'\)"[^>]*data-cms-preview-field="body"[^>]*data-cms-preview-position-field-path="field_presentation\.body"/);
  assert.match(source, /<input id="service-question"[^>]*v-bind="fieldPresentationAttributes\(supportSection, 'description'\)"[^>]*data-cms-preview-position-field-path="field_presentation\.description"/);
  assert.match(source, /<button type="submit"[^>]*v-bind="fieldPresentationAttributes\(supportSection, 'label'\)"[^>]*data-cms-preview-position-field-path="field_presentation\.label"/);
});

test('service online support copy is directly selectable from the same support-section canvas record', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');

  assert.match(source, /<section class="online-service"[^>]*v-bind="sectionPresentationAttributes\(supportSection\)"/);
  assert.match(source, /<h2[^>]*v-bind="fieldPresentationAttributes\(supportSection, 'content_online_title'\)"[^>]*data-cms-preview-field-path="content\.online_title"[^>]*data-cms-preview-position-field-path="field_presentation\.content_online_title"[^>]*>\{\{ supportCopy\('online_title', '在线售后服务'\) \}\}<\/h2>/);
  assert.match(source, /<p[^>]*v-bind="fieldPresentationAttributes\(supportSection, 'content_online_intro'\)"[^>]*data-cms-preview-field-path="content\.online_intro"[^>]*data-cms-preview-position-field-path="field_presentation\.content_online_intro"[^>]*>\{\{ supportCopy\('online_intro', '不需要预先判断应该进入哪个系统。先让 AI 确认设备情况和服务目标，再在需要提交或查询时打开对应页面。'\) \}\}<\/p>/);
});

test('service online support desk exposes every visible copy field for visual editing', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');

  for (const field of ['assistant_brand', 'assistant_heading', 'assistant_intro', 'assistant_cta', 'step_1_title', 'step_1_body', 'step_2_title', 'step_2_body', 'step_3_title', 'step_3_body']) {
    assert.ok(source.includes(`fieldPresentationAttributes(supportSection, 'content_${field}')`));
    assert.ok(source.includes(`data-cms-preview-field-path="content.${field}"`));
    assert.ok(source.includes(`supportCopy('${field}',`));
  }
});

test('CMS edit mode reveals the governed online support block hidden by the public PSD layout', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');
  assert.match(source, /\.service-page>\.online-service\{display:none\}/);
  assert.match(source, /html\[data-cms-preview-edit-mode="true"\] \.service-page>\.online-service\{display:block\}/);
});

test('service FAQ and contact copy are saveable support-content fields in CMS edit mode', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');

  for (const field of ['faq_title', 'faq_intro', 'faq_1_question', 'faq_1_answer', 'faq_1_cta', 'faq_2_question', 'faq_2_answer', 'faq_2_cta', 'faq_3_question', 'faq_3_answer', 'faq_3_cta', 'faq_4_question', 'faq_4_answer', 'faq_4_cta', 'contact_title', 'contact_intro', 'contact_sales_eyebrow', 'contact_sales_title', 'contact_sales_body', 'contact_sales_cta', 'contact_visit_eyebrow', 'contact_visit_title', 'contact_visit_body', 'contact_visit_cta']) {
    assert.ok(source.includes(`fieldPresentationAttributes(supportSection, 'content_${field}')`));
    assert.ok(source.includes(`data-cms-preview-field-path="content.${field}"`));
    assert.ok(source.includes(`supportCopy('${field}',`));
  }
  assert.match(source, /<section class="faq" v-bind="cmsSectionAttrs\(supportSection\)" data-cms-preview-key="support">/);
  assert.match(source, /<section class="contact" v-bind="cmsSectionAttrs\(supportSection\)" data-cms-preview-key="support">/);
  assert.match(source, /html\[data-cms-preview-edit-mode="true"\] \.service-page>\.faq/);
  assert.match(source, /html\[data-cms-preview-edit-mode="true"\] \.service-page>\.contact/);
});

test('visible service human-support label keeps its own support-content canvas binding', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');

  assert.match(source, /<aside\s+class="service-human-support"[\s\S]*?v-bind="sectionPresentationAttributes\(supportSection\)"/);
  assert.match(source, /<span\s+v-bind="fieldPresentationAttributes\(supportSection, 'content_human_support_label'\)"[\s\S]*?data-cms-preview-field-path="content\.human_support_label"[\s\S]*?data-cms-preview-position-field-path="field_presentation\.content_human_support_label"[\s\S]*?>\s*\{\{ contentText\(supportSection, 'human_support_label', '需要人工协助？'\) \}\}\s*<\/span>/);
});

test('service cards keep title and description presentation on their exact source fields', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');

  assert.match(source, /const presentationKey = typeof card\.label === 'string' && card\.label\.trim\(\) \? 'label' : 'title'/);
  assert.match(source, /presentationFieldPath: `items\.\$\{index\}\.field_presentation\.\$\{presentationKey\}`/);
  assert.match(source, /const titlePresentationKey = typeof card\.title === 'string' && card\.title\.trim\(\) \? 'title' : 'label'/);
  assert.match(source, /descriptionFieldPath: `items\.\$\{index\}\.description`/);
  assert.match(source, /descriptionPresentationFieldPath: `items\.\$\{index\}\.field_presentation\.description`/);
  assert.match(source, /fieldPresentationAttributes\(model\.presentation, model\.presentationKey\)/);
  assert.match(source, /:data-cms-preview-position-field-path="model\.presentationFieldPath"/);
  assert.match(source, /fieldPresentationAttributes\(action\.presentation, action\.titlePresentationKey\)/);
  assert.match(source, /:data-cms-preview-field-path="action\.descriptionFieldPath"/);
  assert.match(source, /:data-cms-preview-position-field-path="action\.descriptionPresentationFieldPath"/);
});

test('service office headings keep field presentation only for page-section backed copy', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');

  assert.match(source, /const titlePresentationKey = typeof region\.title === 'string' && region\.title\.trim\(\) \? 'title' : 'label'/);
  assert.match(source, /titlePresentationFieldPath: `items\.\$\{index\}\.field_presentation\.\$\{titlePresentationKey\}`/);
  assert.match(source, /<p[^>]*v-bind="fieldPresentationAttributes\(officeDirectorySection, 'kicker'\)"[^>]*data-cms-preview-position-field-path="field_presentation\.kicker"/);
  assert.match(source, /<h2 id="office-directory-title"[^>]*v-bind="fieldPresentationAttributes\(officeDirectorySection, 'title'\)"[^>]*data-cms-preview-position-field-path="field_presentation\.title"/);
  assert.match(source, /<h3[^>]*v-bind="fieldPresentationAttributes\(region\.presentation, region\.titlePresentationKey\)"[^>]*:data-cms-preview-field-path="region\.titleFieldPath \|\| region\.offices\[0\]\?\.binding\?\.regionTitle"[^>]*:data-cms-preview-position-field-path="region\.titlePresentationFieldPath"/);
  assert.doesNotMatch(source, /fieldPresentationAttributes\(office\.binding/);
});

test('service hero visual copy keeps independent field presentation controls', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');

  assert.match(source, /import \{ fieldPresentationAttributes, sectionPresentationAttributes \} from '~\/shared\/section-presentation\.mjs'/);
  for (const field of ['kicker', 'title', 'description', 'body', 'label']) {
    assert.match(source, new RegExp(`fieldPresentationAttributes\\(heroSection, '${field}'\\)`));
    assert.match(source, new RegExp(`data-cms-preview-position-field-path="field_presentation\\.${field}"`));
  }
  assert.match(source, /presentationFieldPath: field \? `items\.\$\{index\}\.field_presentation\.\$\{field\}`/);
  assert.match(source, /fieldPresentationAttributes\(item\.presentation, item\.presentationKey\)/);
  assert.match(source, /:data-cms-preview-position-field-path="item\.presentationFieldPath"/);
});
