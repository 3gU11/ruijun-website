import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

try {
  console.log('测试1: 首页产品链接修复验证');
  console.log('================================');

  // 访问首页
  await page.goto('http://127.0.0.1:4175', { waitUntil: 'networkidle' });
  console.log('✓ 已加载首页');

  // 等待产品区块加载
  await page.waitForSelector('.product-card', { timeout: 10000 });

  // 获取所有产品卡片的链接
  const productLinks = await page.$$eval('.product-card', cards =>
    cards.map(card => ({
      href: card.getAttribute('href'),
      name: card.querySelector('h3')?.textContent?.trim() || ''
    }))
  );

  console.log('\n产品卡片链接检查:');
  let allCorrect = true;
  productLinks.forEach((link, index) => {
    const isCorrect = link.href && link.href !== '/product' && link.href.startsWith('/product/');
    console.log(`${index + 1}. ${link.name}`);
    console.log(`   链接: ${link.href}`);
    console.log(`   状态: ${isCorrect ? '✅ 正确' : '❌ 错误（应该是 /product/xxx）'}`);
    if (!isCorrect) allCorrect = false;
  });

  console.log('\n================================');
  if (allCorrect) {
    console.log('✅ 测试通过: 所有产品链接都正确指向具体产品页面');
  } else {
    console.log('❌ 测试失败: 部分产品链接不正确');
  }

  // 测试点击第一个产品
  console.log('\n测试点击第一个产品卡片...');
  await page.click('.product-card:first-child');
  await page.waitForTimeout(2000);

  const currentUrl = page.url();
  console.log(`跳转后的URL: ${currentUrl}`);

  if (currentUrl.includes('/product/') && !currentUrl.endsWith('/product')) {
    console.log('✅ 点击测试通过: 成功跳转到产品详情页');
  } else {
    console.log('❌ 点击测试失败: 未跳转到正确的产品详情页');
  }

  await page.waitForTimeout(3000);

} catch (error) {
  console.error('测试出错:', error.message);
} finally {
  await browser.close();
}
