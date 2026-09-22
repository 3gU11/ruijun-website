import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const manufacturingVisibleCopy = Object.freeze({
  hero: Object.freeze({
    processTitle: 'World’s top class\nproduction process',
    outputText: '年产量可达10000台'
  }),
  'precision-machining': Object.freeze({
    description: '自动化数控设备替代了传统的机械加工，\n拥有 100 多台套加工母机',
    detail: '核心设备：\n五面体龙门、五轴数控、立式、卧式等\n各类加工中心、平面磨床、导轨磨床'
  }),
  'sheet-metal': Object.freeze({
    description: '集成先进的信息技术、自动化设备和工业软件，\n实现生产过程的高效、精准、透明和柔性。',
    detail: '智能核心设备：智能下料单元、智能成型单元、\n智能焊接与连接单元、静电喷涂产线'
  }),
  'standardized-assembly': Object.freeze({
    description: '装配体系依托于恒温洁净的作业\n环境，部署了20条全链路制程产\n线。实现MES系统全流程智能化\n管控。'
  }),
  'whole-machine-validation': Object.freeze({
    description: '精密的检测仪器是制造中走丝\n机床的必备。'
  }),
  'electrical-assembly': Object.freeze({
    description: '用现代协同配送模式代替传统\n手工组装：料库根据信息主动\n将物料配送到工位'
  })
});

export function materializeManufacturingVisibleCopy(page) {
  if (!page || typeof page !== 'object' || page.slug !== 'manufacturing' || !Array.isArray(page.sections)) return { changed: false, record: page };
  let changed = false;
  const sections = page.sections.map((section) => {
    const defaults = manufacturingVisibleCopy[String(section?.id || '')];
    if (!defaults || section?.visible_copy_materialized === true) return section;
    const next = { ...section };
    let sectionChanged = false;
    for (const [field, value] of Object.entries(defaults)) {
      if (typeof next[field] !== 'string' || !next[field].trim()) {
        next[field] = value;
        sectionChanged = true;
        changed = true;
      }
    }
    if (sectionChanged) next.visible_copy_materialized = true;
    return next;
  });
  return changed ? { changed: true, record: { ...page, sections } } : { changed: false, record: page };
}

function localEnv(source) {
  return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    return match ? [[match[1], match[2]]] : [];
  }));
}

async function main() {
  const env = localEnv(await readFile(new URL('../.env.local', import.meta.url), 'utf8'));
  const login = await fetch(`${env.CMS_BASE_URL || 'http://127.0.0.1:8055'}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
  });
  if (!login.ok) throw new Error(`Directus login failed: ${login.status}`);
  const token = (await login.json())?.data?.access_token;
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const response = await fetch(`${env.CMS_BASE_URL || 'http://127.0.0.1:8055'}/items/pages/8?fields=id,slug,sections`, { headers });
  if (!response.ok) throw new Error(`Could not read manufacturing page: ${response.status}`);
  const result = materializeManufacturingVisibleCopy((await response.json())?.data);
  if (!result.changed) return console.log('Manufacturing visible copy is already materialized.');
  const update = await fetch(`${env.CMS_BASE_URL || 'http://127.0.0.1:8055'}/items/pages/8`, {
    method: 'PATCH', headers, body: JSON.stringify({ sections: result.record.sections })
  });
  if (!update.ok) throw new Error(`Could not update manufacturing page: ${update.status}`);
  console.log('Materialized manufacturing visible copy into pages/8 draft.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
