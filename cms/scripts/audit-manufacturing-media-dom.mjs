import { readFile } from 'node:fs/promises';
import { chromium } from '../../website/node_modules/playwright/index.mjs';

const env = Object.fromEntries((await readFile(new URL('../.env.local', import.meta.url), 'utf8')).split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/); return match ? [[match[1].trim(), match[2]]] : [];
}));

const pageId = String(process.argv[2] || '8');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
let token;
async function api(path, method = 'GET', body) {
  const response = await fetch(`http://127.0.0.1:8055${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status}`);
  return response.status === 204 ? null : (await response.json()).data;
}

let original;
try {
  token = (await api('/auth/login', 'POST', { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })).access_token;
  original = await api(`/items/pages/${pageId}`);

  await page.goto('http://127.0.0.1:8055/admin/login');
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(env.ADMIN_EMAIL);
  await page.getByRole('textbox', { name: '密码', exact: true }).fill(env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'));

  await page.goto('http://127.0.0.1:8055/admin/ruijun-content-editor-workbench');
  await page.getByRole('button', { name: '先进制造', exact: true }).click();
  await page.getByRole('button', { name: '制造首屏', exact: true }).click();
  await page.locator('.section-card[data-section-key="hero"] input').first().click();
  await page.getByRole('button', { name: '打开实时预览', exact: true }).click();

  const frame = page.frameLocator('iframe');
  await frame.locator('.psd-layer--hero-building').first().waitFor({ state: 'attached', timeout: 60000 });

  // Enter media edit mode so every governed slot receives its editing decoration.
  const editMode = page.getByRole('button', { name: '编辑模式', exact: true });
  if (await editMode.count()) await editMode.click();
  await page.getByTitle('选择图片或视频', { exact: true }).click();
  await frame.locator('html[data-cms-preview-edit-mode="true"][data-cms-preview-edit-tool="media"]').waitFor({ state: 'attached', timeout: 30000 });

  const audit = await frame.locator('html').evaluate(() => {
    const nodes = [...document.querySelectorAll('img, video')];
    const rows = nodes.map((node) => {
      const attrs = Object.fromEntries([...node.attributes]
        .filter((attribute) => attribute.name.startsWith('data-cms-preview'))
        .map((attribute) => [attribute.name.replace('data-cms-preview-', ''), attribute.value]));
      // Walk ancestors: some photo layers attach the governed binding to a
      // wrapper element instead of the <img> itself.
      let chain = node;
      let inherited = null;
      while (chain && !inherited) {
        const parent = chain.parentElement;
        if (!parent) break;
        const parentAttrs = Object.fromEntries([...parent.attributes]
          .filter((attribute) => attribute.name.startsWith('data-cms-preview'))
          .map((attribute) => [attribute.name.replace('data-cms-preview-', ''), attribute.value]));
        if (parentAttrs.collection && parentAttrs['field-path']) inherited = parentAttrs;
        chain = parent;
      }
      const effective = attrs.collection && attrs['field-path'] ? attrs : (inherited || attrs);
      return {
        tag: node.tagName.toLowerCase(),
        cls: (node.className || '').toString().split(/\s+/).filter(Boolean).slice(0, 2).join(' '),
        src: (node.getAttribute('src') || '').slice(0, 64),
        inherited: Boolean(inherited && effective === inherited),
        collection: effective.collection || '',
        itemId: effective['item-id'] || '',
        fieldPath: effective['field-path'] || '',
        mediaRole: effective['media-role'] || '',
        mediaSlot: effective['media-slot'] || '',
        placementKey: effective['placement-key'] || '',
        readonly: attrs.readonly || inherited?.readonly || '',
        parentTag: node.parentElement?.tagName.toLowerCase() || '',
        parentCls: (node.parentElement?.className || '').toString().split(/\s+/).filter(Boolean).slice(0, 3).join(' '),
        parentAttrs: [...(node.parentElement?.attributes || [])]
          .filter((attribute) => attribute.name.startsWith('data-cms-preview'))
          .map((attribute) => `${attribute.name.replace('data-cms-preview-', '')}=${attribute.value}`).join('|'),
        hidden: getComputedStyle(node).display === 'none' || node.offsetParent === null,
        inDialog: Boolean(node.closest('dialog, [role="dialog"], .equipment-preview'))
      };
    });
    // The manufacturing binding contract is collection + item-id + field-path +
    // media-role. `placement-key` is only used by other surfaces, and the
    // manufacturing photo layers additionally carry a `media-slot`.
    const bound = rows.filter((row) => row.collection && row.itemId && row.fieldPath && row.mediaRole);
    const readonlyRows = rows.filter((row) => row.readonly && !(row.collection && row.itemId && row.fieldPath));
    const unclassified = rows.filter((row) => !(row.collection && row.itemId && row.fieldPath && row.mediaRole) && !row.readonly);
    const withSlot = bound.filter((row) => row.mediaSlot);
    return {
      total: rows.length,
      boundCount: bound.length,
      readonlyCount: readonlyRows.length,
      unclassifiedCount: unclassified.length,
      boundWithMediaSlot: withSlot.length,
      inheritedBound: bound.filter((row) => row.inherited).length,
      boundSample: bound.slice(0, 8),
      unclassified: unclassified.slice(0, 25),
      readonlyReasons: [...new Set(readonlyRows.map((row) => row.readonly))].slice(0, 10)
    };
  });

  console.log(JSON.stringify({
    pageId,
    total: audit.total,
    bound: audit.boundCount,
    boundWithMediaSlot: audit.boundWithMediaSlot,
    inheritedBound: audit.inheritedBound,
    explicitReadonly: audit.readonlyCount,
    unclassified: audit.unclassifiedCount
  }));
  console.log('--- bound sample ---');
  audit.boundSample.forEach((row) => console.log(`  ${row.tag}.${row.cls}\n    ${row.collection}/${row.itemId} · ${row.fieldPath} · role=${row.mediaRole} slot=${row.mediaSlot || '-'}`));
  if (audit.unclassified.length) {
    console.log('--- unclassified detail ---');
    audit.unclassified.forEach((row) => console.log(JSON.stringify(row)));
  }
  if (audit.readonlyReasons.length) console.log('--- readonly reasons ---', JSON.stringify(audit.readonlyReasons));
} finally {
  const restored = await api(`/items/pages/${pageId}?fields=id,sections`);
  console.log(JSON.stringify({ pageId, mutated: false, sectionsUnchanged: JSON.stringify(restored.sections) === JSON.stringify(original?.sections) }));
  await browser.close();
}
