<script setup lang="ts">
import { resolvePageSection } from '~/shared/page-sections.mjs';
const { data: pageResponse } = await useFetch('/api/public/v1/pages/contact', { default: () => ({ data: null as Record<string, any> | null }) });
const { data: settingsResponse } = await useFetch('/api/public/v1/navigation', { default: () => ({ data: null as Record<string, any> | null }) });
const pageContent = computed(() => pageResponse.value?.data || null);
const heroContent = computed(() => resolvePageSection(pageContent.value, 'hero', { kicker: 'CONTACT RUIJUN', title: '获取选型建议', body: '从工件资料到设备设置，让我们为您匹配合适的中走丝线切割方案。' }));
const detailsContent = computed(() => resolvePageSection(pageContent.value, 'details', { kicker: 'DIRECT CONTACT', title: '选型前可先发材料', body: '提交加工尺寸、材料、精度与产能要求，可缩短评估时间。' }));
const contacts = computed(() => settingsResponse.value?.data?.contacts || {});
const motionReady = ref(false);
let contactObserver: IntersectionObserver | undefined;

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const revealNodes = [...document.querySelectorAll<HTMLElement>('.contact-reveal')];
  contactObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        contactObserver?.unobserve(entry.target);
      }
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
  revealNodes.forEach((node) => contactObserver?.observe(node));
  requestAnimationFrame(() => { motionReady.value = true; });
});

onBeforeUnmount(() => contactObserver?.disconnect());

useSeoMeta({
  title: () => String(pageContent.value?.seo?.title || heroContent.value.title),
  description: () => String(pageContent.value?.seo?.description || heroContent.value.body)
});
</script>

<template>
  <main class="contact-page" :class="{ 'motion-ready': motionReady }">
    <SiteHeader />
    <section class="contact-hero" aria-labelledby="contact-title">
      <div class="contact-hero__inner">
        <p>{{ heroContent.kicker }}</p>
        <h1 id="contact-title">{{ heroContent.title }}</h1>
        <span>{{ heroContent.body }}</span>
      </div>
    </section>

    <section class="contact-main" aria-label="选型咨询">
      <div class="contact-main__inner">
        <aside class="contact-details contact-reveal">
          <p class="section-kicker">{{ detailsContent.kicker }}</p>
          <h2>{{ detailsContent.title }}</h2>
          <p>{{ detailsContent.body }}</p>
          <dl>
            <div><dt>国内热线</dt><dd><a :href="`tel:${contacts.domestic_phone || '13738375470'}`">{{ contacts.domestic_phone || '137 3837 5470' }}</a></dd></div>
            <div><dt>外贸热线</dt><dd><a :href="`tel:${contacts.export_phone || '17751119936'}`">{{ contacts.export_phone || '177 5111 9936' }}</a></dd></div>
            <div><dt>国内邮箱</dt><dd><a :href="`mailto:${contacts.domestic_email || 'ksrjjx@126.com'}`">{{ contacts.domestic_email || 'ksrjjx@126.com' }}</a></dd></div>
            <div><dt>外贸邮箱</dt><dd><a :href="`mailto:${contacts.export_email || 'kylewuedm@gmail.com'}`">{{ contacts.export_email || 'kylewuedm@gmail.com' }}</a></dd></div>
          </dl>
        </aside>
        <div class="contact-form-shell contact-reveal">
          <LeadInquiryDialog />
        </div>
      </div>
    </section>
    <PsdFooter />
  </main>
</template>

<style scoped>
.contact-page{min-height:100vh;background:#f4f4f2;color:#191a1c}.contact-hero{position:relative;min-height:440px;padding:164px max(6.2%,calc((100% - 1400px)/2)) 80px;overflow:hidden;background:#111315;color:#fff}.contact-hero::after{position:absolute;top:68px;right:-95px;width:530px;height:360px;border:3px dotted #e51b23;border-left:0;border-bottom:0;border-radius:0 80% 0 0;content:"";opacity:.9;transform:rotate(17deg)}.contact-hero__inner{position:relative;z-index:1;max-width:760px}.contact-hero p,.section-kicker{margin:0;color:#ef3d42;font-family:var(--ruijun-font-latin);font-size:12px;letter-spacing:.1em}.contact-hero h1{margin:18px 0 16px;font-size:clamp(46px,5vw,78px);font-weight:500;line-height:1.06}.contact-hero span{display:block;max-width:570px;color:rgb(255 255 255/70%);font-size:17px;line-height:1.7}.contact-main{position:relative;padding:86px max(6.2%,calc((100% - 1400px)/2)) 100px;overflow:hidden;background:#f6f6f4}.contact-main::before{position:absolute;bottom:-250px;left:-180px;width:560px;height:410px;border:42px solid rgb(229 27 35/92%);border-radius:50%;content:"";transform:rotate(20deg)}.contact-main__inner{position:relative;z-index:1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;max-width:1400px;margin:0 auto}.contact-details,.contact-form-shell{box-sizing:border-box;min-height:590px;border:1px solid rgb(255 255 255/65%);border-radius:22px;box-shadow:0 22px 48px rgb(24 27 29/8%)}.contact-details{display:flex;flex-direction:column;padding:52px 56px;background:rgb(232 233 231/76%);backdrop-filter:blur(12px)}.contact-details h2{max-width:350px;margin:16px 0;color:#1c1d1f;font-size:clamp(30px,3vw,46px);font-weight:500;line-height:1.17}.contact-details>p:not(.section-kicker){max-width:400px;margin:0;color:#6d7072;font-size:15px;line-height:1.8}.contact-details dl{margin:auto 0 0;border-top:1px solid rgb(111 114 116/26%)}.contact-details dl div{display:grid;grid-template-columns:100px minmax(0,1fr);gap:14px;padding:17px 0;border-bottom:1px solid rgb(111 114 116/20%)}.contact-details dt{color:#777a7d;font-size:13px}.contact-details dd{margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.contact-details a{color:#1b1c1e;text-decoration:none}.contact-details a:hover{color:#e51b23}.contact-form-shell{padding:52px 56px;background:rgb(17 19 21/94%);backdrop-filter:blur(16px);box-shadow:0 22px 48px rgb(14 16 18/18%)}
@media(max-width:820px){.contact-hero{min-height:360px;padding:124px 24px 64px}.contact-main{padding:62px 24px}.contact-main::before{width:350px;height:250px;border-width:28px}.contact-main__inner{grid-template-columns:1fr;gap:20px}.contact-details,.contact-form-shell{min-height:0;border-radius:14px}.contact-details{padding:36px 28px}.contact-details dl{margin-top:30px}.contact-form-shell{padding:36px 28px}}
</style>

<style scoped>
@keyframes contact-hero-rise{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
@keyframes contact-line-reveal{from{clip-path:inset(0 100% 0 0);opacity:.2}to{clip-path:inset(0 0 0 0);opacity:.9}}
.contact-hero__inner{animation:contact-hero-rise .85s cubic-bezier(.22,.8,.24,1) both}.contact-hero__inner>p{animation:contact-hero-rise .6s .05s both}.contact-hero__inner>h1{animation:contact-hero-rise .75s .14s both}.contact-hero__inner>span{animation:contact-hero-rise .72s .24s both}.contact-hero::after{animation:contact-line-reveal 1.15s .22s cubic-bezier(.22,.8,.24,1) both}
.contact-page.motion-ready .contact-reveal{opacity:0;transform:translateY(34px);transition:opacity .8s cubic-bezier(.22,.8,.24,1),transform .8s cubic-bezier(.22,.8,.24,1)}.contact-page.motion-ready .contact-reveal.is-visible{opacity:1;transform:none}.contact-page.motion-ready .contact-details.is-visible{transition-delay:.04s}.contact-page.motion-ready .contact-form-shell.is-visible{transition-delay:.16s}.contact-details dl div{opacity:0;transform:translateX(-16px);transition:opacity .55s ease,transform .55s ease}.contact-details.is-visible dl div{opacity:1;transform:none}.contact-details.is-visible dl div:nth-child(1){transition-delay:.12s}.contact-details.is-visible dl div:nth-child(2){transition-delay:.2s}.contact-details.is-visible dl div:nth-child(3){transition-delay:.28s}.contact-details.is-visible dl div:nth-child(4){transition-delay:.36s}.contact-form-shell :deep(form){transition:transform .7s cubic-bezier(.22,.8,.24,1)}.contact-form-shell.is-visible :deep(form){transform:none}
@media(prefers-reduced-motion:reduce){.contact-hero__inner,.contact-hero__inner>p,.contact-hero__inner>h1,.contact-hero__inner>span,.contact-hero::after{animation:none}.contact-details dl div{opacity:1;transform:none}}
</style>

<style scoped>
/* The contact card is intentionally asymmetric: the form carries the primary action. */
.contact-main__inner{grid-template-columns:minmax(300px,.82fr) minmax(460px,1.18fr);align-items:center}
.contact-details{min-height:520px;padding:48px clamp(34px,4vw,56px)}
.contact-details h2{max-width:430px;font-size:clamp(30px,2.65vw,42px);letter-spacing:0;line-height:1.16}
.contact-details>p:not(.section-kicker){max-width:430px}
.contact-form-shell{min-height:660px;padding:52px clamp(34px,4vw,56px)}
@media(max-width:820px){.contact-main__inner{grid-template-columns:1fr}.contact-details,.contact-form-shell{min-height:0}.contact-details{padding:36px 28px}.contact-form-shell{padding:36px 28px}}
</style>
