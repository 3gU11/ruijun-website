<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'full' | 'compact' }>(), { variant: 'compact' });
</script>

<template>
  <footer v-if="variant === 'full'" class="site-footer">
    <div class="footer-brand"><NuxtLink to="/" aria-label="返回瑞钧智科首页"><img src="/assets/ruijun-logo.png" alt="瑞钧智科 RUIJUN"></NuxtLink><p>专注中走丝线切割机床制造</p></div>
    <div class="footer-column"><b>产品中心</b><NuxtLink to="/product">灵动工作站</NuxtLink><NuxtLink to="/product">FR-XS 系列</NuxtLink><NuxtLink to="/product">FT / FR / FL 系列</NuxtLink></div>
    <div class="footer-column"><b>先进智造</b><NuxtLink to="/manufacturing">制造工厂</NuxtLink><NuxtLink to="/manufacturing">核心性能</NuxtLink><NuxtLink to="/about">发展历程</NuxtLink></div>
    <div class="footer-column"><b>联系我们</b><span>常熟工厂：常熟市东南开发区银环路78号</span><span>昆山工厂：江苏省苏州市昆山市巴城镇石牌长江路8号</span><span>服务热线：137 3837 5470</span><span>ksrjjx@126.com</span></div>
    <div class="footer-service"><span>大陆售后</span><b>在线服务</b><strong>150 5016 6844</strong><NuxtLink to="/service">进入售后系统 →</NuxtLink></div>
    <small>© 2026 Suzhou Ruijun Intelligence Technology Co., Ltd.</small>
  </footer>
  <footer v-else class="compact-footer"><span>© 2026 Suzhou Ruijun Intelligence Technology Co., Ltd.</span><NuxtLink to="/service">联系瑞钧</NuxtLink></footer>
</template>

<style scoped>
.site-footer{position:relative;display:grid;grid-template-columns:1.3fr .65fr .65fr 1.45fr .7fr;gap:42px;padding:8vh 7% 50px;color:#fff;background:#0b0b0c;font-family:var(--ruijun-font-cn)}.footer-brand img{width:auto;height:56px}.footer-brand p{margin:24px 0 0;color:#7d8084;font-size:14px}.footer-column{display:flex;flex-direction:column;align-items:flex-start;gap:9px;color:#8c8f93;font-size:clamp(12px,.74vw,14px);line-height:1.55}.footer-column b{margin-bottom:8px;color:var(--ruijun-red);font-size:clamp(17px,1.05vw,20px);font-weight:500}.footer-column a{text-decoration:none}.footer-column a:hover{color:#fff}.footer-service{align-self:start;padding:18px;background:#1b1c1e;text-align:center}.footer-service span{display:block;color:#9b9da0;font-size:12px}.footer-service b{display:block;color:#34d272;font-size:18px}.footer-service strong{display:block;color:#fff;font-size:13px;font-weight:500}.footer-service a{display:inline-block;margin-top:10px;color:#fff;font-size:12px;font-weight:600;text-decoration:none}.site-footer>small{position:absolute;right:7%;bottom:20px;color:#535559;font-family:var(--ruijun-font-latin);font-size:10px}.compact-footer{display:flex;min-height:110px;padding:0 6.2%;align-items:center;justify-content:space-between;color:#8f9195;background:#0b0b0c;font-family:var(--ruijun-font-cn);font-size:12px}.compact-footer a{color:#fff;text-decoration:none}.compact-footer a:hover{color:var(--ruijun-red)}
@media(max-width:900px){.site-footer{grid-template-columns:1fr 1fr;gap:30px}.footer-brand,.footer-column:last-of-type{grid-column:1/-1}}
@media(max-width:760px){.site-footer{grid-template-columns:1fr;padding:48px 20px 62px;gap:26px}.footer-brand,.footer-column:last-of-type{grid-column:auto}.footer-brand img{height:44px}.footer-service{text-align:left}.site-footer>small{right:auto;left:20px}.compact-footer{min-height:90px;padding:24px 20px;flex-direction:column;align-items:flex-start;justify-content:center;gap:8px}}
</style>
