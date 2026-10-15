import { chromium } from '../../../website/node_modules/playwright/index.mjs';

// Public-site quality sweep: load every page the way a visitor would and report
// what a visitor would actually hit — console errors, failed requests, broken
// images, and pages that render suspiciously little.
//
// Read-only: nothing is written to the CMS.
const SITE = 'http://127.0.0.1:4175';
const PAGES = ['', 'about', 'news', 'manufacturing', 'product', 'service', 'contact'];

// Third-party noise and benign browser behaviour that is not the site's problem.
const IGNORE = [
  /favicon/i,
  /Download the Vue Devtools/i,
  /\[vite\]/i,
  /net::ERR_ABORTED.*\.(woff2?|ttf)/i,
  // Media elements abort their initial request when the browser switches to
  // range requests. Expected, not a failure. Managed CMS media is streamed from
  // /api/public/v1/media/asset/<uuid>, which has no file extension, so the path
  // is matched on the route instead of the URL suffix.
  /net::ERR_ABORTED.*\.(mp4|webm|m4a|mp3)/i,
  /net::ERR_ABORTED.*\/api\/public\/v1\/media\/asset\//i
];

const report = [];
const browser = await chromium.launch({ headless: true });
try {
  for (const path of PAGES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const consoleErrors = [];
    const failedRequests = [];
    page.on('console', (m) => {
      if (m.type() !== 'error' && m.type() !== 'warning') return;
      const text = m.text();
      if (IGNORE.some((re) => re.test(text))) return;
      consoleErrors.push(`${m.type()}: ${text.slice(0, 180)}`);
    });
    page.on('requestfailed', (r) => {
      const url = r.url();
      const text = r.failure()?.errorText || 'failed';
      // Match against the combined message: some filters key on the failure kind
      // ("net::ERR_ABORTED ..."), not just the URL.
      if (IGNORE.some((re) => re.test(`${text} ${url}`))) return;
      failedRequests.push(`${text} ${url.slice(0, 140)}`);
    });
    page.on('response', (r) => {
      if (r.status() >= 400) failedRequests.push(`HTTP ${r.status()} ${r.url().slice(0, 140)}`);
    });

    let status = 0;
    try {
      const response = await page.goto(`${SITE}/${path}`, { waitUntil: 'networkidle', timeout: 60000 });
      status = response?.status() ?? 0;
    } catch (error) {
      failedRequests.push(`navigation: ${error.message.slice(0, 120)}`);
    }
    await page.waitForTimeout(2500);

    const dom = await page.evaluate(() => {
      const images = [...document.querySelectorAll('img')];
      const broken = images
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => (img.currentSrc || img.src || '').split('/').slice(-1)[0].slice(0, 80));
      const text = document.body.innerText || '';
      return {
        title: document.title,
        textLength: text.replace(/\s+/g, '').length,
        // A list page with nothing published legitimately shows an explicit empty
        // state; that is not "the page is broken".
        emptyState: /暂无|没有更多|coming soon/i.test(text),
        images: images.length,
        brokenImages: broken,
        interactive: document.querySelectorAll('a, button').length,
        headings: document.querySelectorAll('h1, h2').length,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
        lang: document.documentElement.lang || ''
      };
    });

    report.push({ path: `/${path}`, status, ...dom, consoleErrors, failedRequests });
    await page.close();
  }
} finally {
  await browser.close();
}

// --- report ---
let problems = 0;
for (const r of report) {
  const issues = [];
  if (r.status !== 200) issues.push(`HTTP ${r.status}`);
  if (r.consoleErrors.length) issues.push(`${r.consoleErrors.length} 条控制台报错`);
  if (r.failedRequests.length) issues.push(`${r.failedRequests.length} 个失败请求`);
  if (r.brokenImages.length) issues.push(`${r.brokenImages.length} 张坏图`);
  if (r.textLength < 400 && !r.emptyState) issues.push(`正文过短(${r.textLength}字)且无空状态提示`);
  if (!r.headings) issues.push('无 h1/h2');
  if (r.horizontalOverflow) issues.push('横向溢出');
  if (!r.lang) issues.push('缺 lang 属性');

  problems += issues.length;
  console.log(`\n${issues.length ? '⚠' : '✅'} ${r.path}  [${r.status}]  ${r.textLength} 字 | ${r.images} 图 | ${r.interactive} 可交互 | ${r.headings} 标题`);
  console.log(`   title: ${r.title}`);
  for (const issue of issues) console.log(`   → ${issue}`);
  for (const e of r.consoleErrors.slice(0, 4)) console.log(`   [console] ${e}`);
  for (const f of r.failedRequests.slice(0, 4)) console.log(`   [request] ${f}`);
  if (r.brokenImages.length) console.log(`   [broken] ${r.brokenImages.slice(0, 6).join(', ')}`);
}

console.log(`\n${'='.repeat(60)}`);
console.log(problems === 0 ? `7 个页面全部干净` : `共 ${problems} 个问题`);
