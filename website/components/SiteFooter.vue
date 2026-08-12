<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'full' | 'compact'; homePsd?: boolean }>(), { variant: 'compact', homePsd: false });
</script>

<template>
  <footer v-if="variant === 'full'" class="site-footer">
    <div class="footer-contact">
      <NuxtLink class="footer-wordmark" to="/" aria-label="返回首页"><img src="/assets/psd/footer/wordmark.png" alt="瑞钧中走丝"></NuxtLink>
      <div class="contact-row"><img src="/assets/psd/footer/address.png" alt=""><p>常熟工厂：江苏省苏州市常熟市沙家浜儒浜路78号<br>昆山工厂：江苏省苏州市昆山市巴城苏杭路88号</p></div>
      <div class="contact-row"><img src="/assets/psd/footer/phone.png" alt=""><p>热线：13738375470<br>外贸：17751119936</p></div>
      <div class="contact-row"><img src="/assets/psd/footer/email.png" alt=""><p>国内邮箱：ksrjjx@126.com<br>外贸邮箱：kylewuedm@gmail.com</p></div>
    </div>
    <nav class="footer-column"><b>产品中心</b><NuxtLink to="/product">灵动切割工作站</NuxtLink><NuxtLink to="/product">FR-XS(AUTO)</NuxtLink><NuxtLink to="/product">FR-XS(pro)</NuxtLink><NuxtLink to="/product">FT-XS(pro)</NuxtLink><NuxtLink to="/product">FR-Y(pro)</NuxtLink><NuxtLink to="/product">FL-XS(pro)</NuxtLink></nav>
    <nav class="footer-column"><b>先进智造</b><NuxtLink to="/manufacturing">CNC车间</NuxtLink><NuxtLink to="/manufacturing">钣金车间</NuxtLink><NuxtLink to="/manufacturing">装配车间</NuxtLink></nav>
    <nav class="footer-column"><b>关于我们</b><NuxtLink to="/about#honors">荣誉资质认证</NuxtLink><NuxtLink to="/about#history">品牌发展历程</NuxtLink></nav>
    <a class="purchase-card" href="tel:15050166844"><span>大批量采购</span><strong>你有量<br>我有价</strong><b>15050166844</b></a>
  </footer>
  <footer v-else class="compact-footer"><span>© 2026 Suzhou Ruijun Intelligence Technology Co., Ltd.</span><NuxtLink to="/service">联系瑞钧</NuxtLink></footer>
</template>

<style scoped>
.site-footer{position:relative;display:grid;grid-template-columns:31.5vw 10.4vw 10.4vw 10.4vw;column-gap:5.6vw;min-height:48.5vw;padding:11.3vw 10.8vw 54px;background:#111;color:#fff;font-family:var(--ruijun-font-cn)}
.footer-contact{display:flex;flex-direction:column;gap:2vw}.footer-wordmark{display:block;width:25vw;margin-bottom:6.4vw}.footer-wordmark img{display:block;width:100%;height:auto}.contact-row{display:flex;align-items:center;gap:1.62vw;color:#eee;font-size:1.13vw;line-height:1.65}.contact-row img{width:2.43vw;height:2.43vw;object-fit:contain}.contact-row p{margin:0}.footer-column{display:flex;flex-direction:column;align-items:flex-start;gap:1.05vw;padding-top:0;color:#aaa;font-size:1.13vw;line-height:1.2}.footer-column b{margin-bottom:1.05vw;color:#f22;font-size:2.02vw;font-weight:500;white-space:nowrap}.footer-column a{color:inherit;text-decoration:none}.footer-column a:hover{color:#fff}.purchase-card{position:absolute;top:56.8%;right:10.8vw;display:flex;width:11.6vw;min-height:11.2vw;flex-direction:column;align-items:center;justify-content:center;background:#292929;color:#eee;text-decoration:none}.purchase-card span{font-size:1.29vw}.purchase-card strong{margin:.97vw 0 1.05vw;color:#12cfe8;font-size:1.62vw;line-height:1.05;text-align:center;font-weight:500}.purchase-card b{font-size:1.29vw;font-weight:400;white-space:nowrap}@media(max-width:760px){.site-footer{grid-template-columns:1fr 1fr;padding:48px 24px;gap:30px;min-height:auto}.footer-contact{grid-column:1/-1;gap:25px}.footer-wordmark{width:270px;margin-bottom:25px}.contact-row{gap:20px;font-size:14px}.contact-row img{width:30px;height:30px}.footer-column{gap:13px;padding-top:0;font-size:14px}.footer-column b{margin-bottom:13px;font-size:25px}.purchase-card{position:static;grid-column:1/-1;max-width:190px;min-height:137px}.purchase-card span{font-size:16px}.purchase-card strong{margin:12px 0 13px;font-size:20px}.purchase-card b{font-size:16px}.compact-footer{min-height:90px;padding:24px 20px;display:flex;flex-direction:column;align-items:flex-start;gap:8px;background:#111;color:#8f9195;font-size:12px}.compact-footer a{color:#fff;text-decoration:none}}
</style>
