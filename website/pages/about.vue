<script setup lang="ts">
import { getSequentialLineReveal, getStoryMotion, getTimelineMotion } from '~/shared/about-motion.mjs';
import { resolvePageSection } from '~/shared/page-sections.mjs';
import { fieldPresentationAttributes, sectionPresentationAttributes } from '~/shared/section-presentation.mjs';
import { pageSectionMediaBinding, qualificationAssetBinding } from '~/shared/visual-binding-paths.mjs';
import { clientGalleryAssets, factoryGalleryAssets, partnerGalleryAssets } from '~/shared/about-factory-gallery.mjs';
import '~/assets/page-content.css';

const { data: page } = await useFetch('/api/public/v1/pages/about', {
  default: () => ({ data: null as { title?: string } | null, source: 'static', cache: 'unavailable' })
});
const { data: publicMilestones } = await useFetch('/api/public/v1/milestones', {
  default: () => ({ data: [] as Array<{ year: number; event: string; evidence: string }>, source: 'static', cache: 'unavailable' })
});
const { data: publicQualifications } = await useFetch('/api/public/v1/qualifications', {
  default: () => ({ data: [] as Array<{ type: string; name: string; assets: Array<{ path: string; alt?: string; managed?: boolean }> }>, source: 'static', cache: 'unavailable' })
});
const { overlayRecord, overlayList } = useCmsDraftPreview();
const pageContent = computed(() => overlayRecord('pages', page.value?.data || null, (draft) => draft.slug === 'about'));
const heroContent = computed(() => resolvePageSection(pageContent.value, 'hero', { title: '专攻电加工卡脖子技术\n为客户创造最大价值' }));
const overviewFallbackBody = '瑞钧智科是一家专业研发、制造与销售电火花周边系统及数控机床的高新技术企业。公司始创于1997年，是国内较早制造数控放电机床的企业之一。目前在江苏昆山、常熟共建有100000 M2制造基地，常熟工厂以工业4.0为核心，集办公、工程研发、自动化生产、恒温车间、物联仓储、绿色节能于一体，打造现代化“未来工厂”。投入一百多台套数控工作母机，可年产上万台套中走丝线切割机床。公司一直致力于攻克电加工卡脖子技术，为客户解决加工难题并提供智能化中走丝线切割机床。产品深得客户青睐，目前已成长为行业头部企业。';
const overviewContent = computed(() => resolvePageSection(pageContent.value, 'overview', {
  kicker: '累计数万用户', title: '愿景：成为一家为客户创造更大价值的企业', description: '精神：专注、专业、诚信、创新',
  body: overviewFallbackBody,
  items: ['我们拥有完全自主的产品设计、研发！', '我们拥有全产业链制造能力！', '我们拥有技术一流的员工团队！', '我们拥有先进的精良设备！', '我们拥有保证产品质量的严谨章程！', '我们拥有完善的售前、售中、售后服务！'].map((label) => ({ label }))
}));
const overviewBody = computed(() => String(overviewContent.value.body || overviewFallbackBody));
const historyContent = computed(() => resolvePageSection(pageContent.value, 'history', {
  title: '瑞钧智科的中走丝制造历史',
  kicker: "The Development\nHistory of Ruijun.\nZhike's Mid Speed\nWire Manufacturing",
  label: 'SCROLL TO EXPLORE'
}));
const historyBackground = computed(() => sectionMedia('history', [], 'background')[0] || sectionMedia('history', [], '')[0]);
const historyIcon = computed(() => {
  const sectionIcon = sectionMedia('history', [], 'icon')[0];
  if (sectionIcon) return sectionIcon;
  const milestoneIcon = previewMilestones.value.find((milestone) => typeof milestone?.icon_asset === 'string' && milestone.icon_asset.trim())?.icon_asset;
  return { path: String(milestoneIcon || '/assets/about-psd/history-guide-wheel.png').trim(), alt: '时间轴导航', fieldPath: '' };
});
const factoryContent = computed(() => resolvePageSection(pageContent.value, 'factory', { title: '厂区风貌' }));
const certificatesContent = computed(() => resolvePageSection(pageContent.value, 'certificates', { title: '认证证书' }));
type GalleryAsset = { path: string; alt?: string; managed?: boolean; name?: string; nameFieldPath?: string; role?: string; sourceKey?: string; itemId?: string; fieldPath?: string; positionFieldPath?: string };

function findAboutSection(id: string) {
  const sections = Array.isArray(pageContent.value?.sections) ? pageContent.value.sections : [];
  return sections.find((section: Record<string, unknown>) => section && typeof section === 'object' && section.id === id) as Record<string, any> | undefined;
}

function sectionMedia(id: string, fallback: GalleryAsset[], role = '') {
  const media = findAboutSection(id)?.media;
  if (!Array.isArray(media)) return fallback;
  const selected = media
    .map((asset, assetIndex) => ({ asset, binding: pageSectionMediaBinding(assetIndex) }))
    .filter(({ asset }) => asset && typeof asset.path === 'string' && asset.path.trim() && (!role || asset.role === role))
    .map(({ asset, binding }) => ({
      path: asset.path.trim(), alt: typeof asset.alt === 'string' ? asset.alt : '', managed: asset.managed === true, role: typeof asset.role === 'string' ? asset.role : '',
      fieldPath: asset.managed === true ? binding?.fieldPath : undefined, positionFieldPath: asset.managed === true ? binding?.positionFieldPath : undefined
    }));
  return selected.length ? selected : fallback;
}

function sectionText(id: string, field: 'title' | 'body' | 'kicker' | 'description', fallback: string) {
  const value = findAboutSection(id)?.[field];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

const title = computed(() => heroContent.value.title);
const heroBackground = computed(() => sectionMedia('hero', [{ path: '/assets/about-psd/hero-machine.jpg', alt: '瑞钧智科中走丝线切割机床' }], 'background')[0]);
const heroBackdrop = computed(() => {
  const media = findAboutSection('hero')?.media;
  if (Array.isArray(media)) {
    const usable = media.map((asset, index) => ({ asset, index })).filter(({ asset }) => asset && asset.managed === true && typeof asset.path === 'string' && asset.path.trim());
    const dedicated = usable.find(({ asset }) => asset.role === 'backdrop');
    const background = usable.find(({ asset }) => asset.role === 'background');
    const selected = dedicated || background;
    if (selected) {
      const binding = pageSectionMediaBinding(selected.index);
      return { path: selected.asset.path.trim(), alt: typeof selected.asset.alt === 'string' ? selected.asset.alt : '', managed: true, fieldPath: binding?.fieldPath, positionFieldPath: binding?.positionFieldPath };
    }
  }
  const binding = pageSectionMediaBinding(0);
  return { path: '/assets/about-psd/banner.jpg', alt: '', fieldPath: binding?.fieldPath, positionFieldPath: binding?.positionFieldPath };
});
const heroBackdropStyle = computed(() => {
  const media = heroContent.value.media_presentation || {};
  const focalX = Number.isFinite(Number(media.focal_x)) ? Number(media.focal_x) : 50;
  const focalY = Number.isFinite(Number(media.focal_y)) ? Number(media.focal_y) : 50;
  return { backgroundImage: `url(${heroBackdrop.value.path})`, backgroundPosition: `${focalX}% ${focalY}%` };
});
const heroMachine = computed(() => sectionMedia('hero', [{ path: '/assets/psd/reason-intro-machine.png', alt: '' }], 'foreground')[0]);
const overviewImage = computed(() => sectionMedia('overview', [{ path: '/assets/about-psd/intro-building.jpg', alt: '瑞钧智科现代化厂区' }])[0]);
const heroNumber = computed(() => sectionText('hero', 'kicker', '30'));
const heroUnit = computed(() => sectionText('hero', 'description', '年深耕线切割制造'));
const brandStory = computed(() => resolvePageSection(pageContent.value, 'brand-story', { title: '品牌故事', kicker: 'Since', description: '1997', body: '' }));
const brandStoryTitle = computed(() => sectionText('brand-story', 'title', '品牌故事'));
const brandStoryKicker = computed(() => sectionText('brand-story', 'kicker', 'Since'));
const brandStoryYear = computed(() => sectionText('brand-story', 'description', '1997'));
const brandStoryParagraphs = computed(() => sectionText('brand-story', 'body', '上世纪 90 年代初，二十来岁的年轻兄弟俩立足温州，经营线切割加工业务，并随父亲经销国营线切割机床。随着市场经济蓬勃发展，市场机床需求高涨，国营厂产能难以满足订单。1997 年，兄弟二人创办丰华数控，转型自主生产机床。\n\n2003 年“非典”市场遇冷，团队潜心研发，成功推出中走丝线切割机床。2006 年企业迁至产业区位更优的昆山，因“丰华”商标已被注册，取自兄弟姓名各一字，定名瑞钧。\n\n2013 年整机销量突破 1000 台；2014 年迁入新制造基地，2016 年扩建标准化产线，跻身行业头部。2022 年研发自动穿丝中走丝，迈向设备自动化。2023 年斥资数亿元在常熟建设 4.0 智慧工厂，引进百台加工母机，新工厂于 2025 年正式投产。').split(/\n\s*\n/));
const honorContent = computed(() => resolvePageSection(pageContent.value, 'honors', { title: '荣誉证书' }));
const patentContent = computed(() => resolvePageSection(pageContent.value, 'patents', { title: '专利证书', description: '79件专利，其中发明专利9件' }));
const partnersContent = computed(() => resolvePageSection(pageContent.value, 'partners', { title: '众多世界知名品牌厂家和供应商合作' }));
const domesticClientsContent = computed(() => resolvePageSection(pageContent.value, 'clients-domestic', { title: '国内客户' }));
const globalClientsContent = computed(() => resolvePageSection(pageContent.value, 'clients-global', { title: '国外客户' }));
const historyEnglishLines = computed(() => {
  const configured = String(historyContent.value.kicker || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return configured.length ? configured : ['The Development', 'History of Ruijun.', "Zhike's Mid Speed", 'Wire Manufacturing'];
});
const historyHint = computed(() => String(historyContent.value.label || '').trim() || 'SCROLL TO EXPLORE');
const historySection = ref<HTMLElement>();
const historyViewport = ref<HTMLElement>();
const historyTrack = ref<HTMLElement>();
const historyCopy = ref<HTMLElement>();
const historyCursor = ref<HTMLElement>();
const historyOrbitRing = ref<HTMLElement>();
const historyWheelCursor = ref<HTMLElement>();
const historyWheel = ref<HTMLImageElement>();
const storySection = ref<HTMLElement>();
const storyBackdrop = ref<HTMLElement>();
const storyCopy = ref<HTMLElement>();
let gsapContext: { revert: () => void } | undefined;
let stopHistoryMotion: (() => void) | undefined;
let aboutDisposed = false;

const fallbackFactoryImages = [
  ['factory-01.jpg', '瑞钧厂区外景一'], ['factory-02.jpg', '瑞钧厂区外景二'],
  ['factory-03.jpg', '瑞钧厂区外景三'], ['factory-04.jpg', '瑞钧厂区广场']
];
const certificateAlts = ['质量管理体系认证证书', '职业健康安全管理体系认证证书', '质量管理体系英文认证证书', '环境管理体系认证证书', '环境管理体系英文认证证书', '职业健康安全英文认证证书', 'TUV认证证书'];
const honorAlts = ['高新技术企业证书', '企业技术中心证书', '企业荣誉证书', '专精特新企业证书', '行业荣誉证书'];
const patentAlts = ['导丝机构专利证书', '回卷检测机构专利证书', '精密中走丝专利证书', '线切割导丝机专利证书', '喷液机构专利证书', '钼丝筒专利证书', '穿丝线切割机专利证书', '辅助夹具专利证书'];
const fallbackCertificates = certificateAlts.map((alt, index) => ({ path: `/assets/about-psd/certificate-${String(index + 1).padStart(2, '0')}.jpg`, alt }));
const fallbackHonors = honorAlts.map((alt, index) => ({ path: `/assets/about-psd/honor-${String(index + 1).padStart(2, '0')}.jpg`, alt }));
const fallbackPatents = patentAlts.map((alt, index) => ({ path: `/assets/about-psd/patent-${String(index + 1).padStart(2, '0')}.jpg`, alt }));
const fallbackDomesticClients: GalleryAsset[] = Array.from({ length: 5 }, (_, index) => ({ path: `/assets/about-psd/client-domestic-${String(index + 1).padStart(2, '0')}.jpg`, alt: `国内客户现场${'一二三四五'[index]}` }));
const fallbackGlobalClients: GalleryAsset[] = Array.from({ length: 5 }, (_, index) => ({ path: `/assets/about-psd/client-global-${String(index + 1).padStart(2, '0')}.jpg`, alt: `海外客户现场${'一二三四五'[index]}` }));
const fallbackMilestones = [
  ['1997', '成立丰华数控', '公司始创'], ['2003', '创新中走丝', '初代研发'], ['2006', '成立瑞钧机械', '迁址昆山'],
  ['2014', '启用新建厂房', '规模化生产'], ['2016', '扩建流水线车间', '标准化生产'], ['2025', '启用瑞钧智科', '常熟基地']
];
const previewMilestones = computed(() => overlayList('milestones', publicMilestones.value?.data || []));
const previewQualifications = computed(() => overlayList('qualifications', publicQualifications.value?.data || []));
const milestones = computed(() => previewMilestones.value.length
  ? previewMilestones.value.map((milestone) => [String(milestone.year), milestone.event, milestone.evidence, milestone.media, milestone.icon_asset, milestone.source_key, milestone.id])
  : fallbackMilestones);
function formatMilestoneEvidence(evidence: unknown) {
  const text = String(evidence || '').trim();
  return /^[（(].*[）)]$/.test(text) ? text : `（${text}）`;
}
const qualificationAssets = (type: string, fallback: Array<{ path: string; alt: string }>) => computed(() => {
  const assets = previewQualifications.value
    ?.filter((qualification) => qualification.type === type)
    .flatMap((qualification) => qualification.assets.map((asset, assetIndex) => {
      const binding = qualificationAssetBinding(qualification, asset.sourceIndex ?? assetIndex);
      return { path: asset.path, alt: asset.alt || qualification.name, managed: asset.managed === true, name: qualification.name, nameFieldPath: 'name', sourceKey: qualification.source_key, itemId: binding?.itemId, fieldPath: binding?.fieldPath };
    })) || [];
  return assets.length ? assets : fallback;
});
const certificates = qualificationAssets('certificate', fallbackCertificates);
const honors = qualificationAssets('honor', fallbackHonors);
const patents = qualificationAssets('patent', fallbackPatents);

const fallbackFactoryGallery: GalleryAsset[] = fallbackFactoryImages.map(([image, alt]) => ({
  path: `/assets/about-psd/${image}`,
  alt
}));
const factoryGallery = computed(() => factoryGalleryAssets(findAboutSection('factory'), fallbackFactoryGallery));
const partnerImages = computed(() => partnerGalleryAssets(findAboutSection('partners'), [{ path: '/assets/about-psd/suppliers.jpg', alt: '瑞钧智科合作品牌与供应商' }]));
const domesticClients = computed(() => clientGalleryAssets(findAboutSection('clients-domestic'), fallbackDomesticClients));
const globalClients = computed(() => clientGalleryAssets(findAboutSection('clients-global'), fallbackGlobalClients));
const galleryOpen = ref(false);
const galleryItems = ref<GalleryAsset[]>([]);
const galleryIndex = ref(0);
const galleryTitle = ref('');
const galleryCurrent = computed(() => galleryItems.value[galleryIndex.value] || null);

function openGallery(items: GalleryAsset[], index: number, title: string) {
  galleryItems.value = items;
  galleryIndex.value = Math.max(0, Math.min(index, items.length - 1));
  galleryTitle.value = title;
  galleryOpen.value = true;
  document.body.classList.add('gallery-is-open');
}

function closeGallery() {
  galleryOpen.value = false;
  document.body.classList.remove('gallery-is-open');
}

function moveGallery(step: number) {
  if (!galleryItems.value.length) return;
  galleryIndex.value = (galleryIndex.value + step + galleryItems.value.length) % galleryItems.value.length;
}

function handleGalleryKeydown(event: KeyboardEvent) {
  if (!galleryOpen.value) return;
  if (event.key === 'Escape') closeGallery();
  if (event.key === 'ArrowLeft') moveGallery(-1);
  if (event.key === 'ArrowRight') moveGallery(1);
}

onMounted(async () => {
  aboutDisposed = false;
  // The PSD keeps a static wheel fallback in the template; replace it after
  // hydration when the history section provides an approved CMS icon.
  await nextTick();
  if (historyWheel.value && historyIcon.value.path) historyWheel.value.src = historyIcon.value.path;
  // A client-side navigation from the full-screen news page can preserve its
  // deep scroll position. Start About at its own top panel before enabling
  // the history wheel Observer.
  if (!window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion) {
    const [{ gsap }, { ScrollTrigger }, { Observer }, { ScrollToPlugin }] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
      import('gsap/Observer'),
      import('gsap/ScrollToPlugin')
    ]);
    // Route navigation can unmount this page while the GSAP chunks are loading.
    // In that case creating a global Observer would leave it intercepting wheel input.
    if (aboutDisposed) return;
    gsap.registerPlugin(ScrollTrigger, Observer, ScrollToPlugin);
    gsapContext = gsap.context(() => {
      const heroCopy = storyCopy.value;
      if (heroCopy) {
        const heroNumber = heroCopy.querySelector<HTMLElement>('strong');
        const heroUnit = heroCopy.querySelector<HTMLElement>('span');
        const heroTitle = heroCopy.querySelector<HTMLElement>('h1');
        if (heroNumber && heroUnit && heroTitle) {
          gsap.fromTo(heroNumber, { autoAlpha: 0, x: -72 }, { autoAlpha: 1, x: 0, duration: .72, ease: 'power3.out' });
          gsap.fromTo(heroUnit, { autoAlpha: 0, x: 54 }, { autoAlpha: 1, x: 0, duration: .72, delay: .12, ease: 'power3.out' });
          gsap.fromTo(heroTitle, { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0, duration: .86, delay: .28, ease: 'power3.out' });
        }
      }
      gsap.utils.toArray<HTMLElement>('.about-chapter .section-inner').forEach((section) => {
        const heading = section.querySelector('h2');
        const visualItems = section.querySelectorAll('.document-row img, .photo-row img, .factory-grid img, .partners-image');
        if (heading) gsap.fromTo(heading, { autoAlpha: 0, x: -54 }, { autoAlpha: 1, x: 0, duration: .72, ease: 'power3.out', scrollTrigger: { trigger: section, start: 'top 72%', once: true } });
        if (visualItems.length) gsap.fromTo(visualItems, { autoAlpha: 0, y: 42 }, { autoAlpha: 1, y: 0, duration: .72, stagger: .055, ease: 'power3.out', scrollTrigger: { trigger: section, start: 'top 66%', once: true } });
        // Continuous chapter rhythm inspired by Nanfu: content enters as a group,
        // while long image rows and hero media move at a gentler scroll rate.
        const inner = section.querySelector<HTMLElement>('.section-inner');
        if (inner) gsap.fromTo(inner, { y: 42 }, {
          y: -42,
          ease: 'none',
          scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 0.8 }
        });
        const row = section.querySelector<HTMLElement>('.document-row, .photo-row');
        if (row) gsap.fromTo(row, { x: 34 }, {
          x: -34,
          ease: 'none',
          scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 0.8 }
        });
        const images = section.querySelectorAll<HTMLElement>('.factory-grid img, .partners-image');
        if (images.length) gsap.fromTo(images, { scale: 1.08, yPercent: -3 }, {
          scale: 1, yPercent: 3, ease: 'none',
          scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 0.8 }
        });
      });
      const overview = document.querySelector<HTMLElement>('.about-overview');
      if (overview) {
        const overviewTop = overview.querySelector<HTMLElement>('.overview-top');
        const overviewIntro = overview.querySelector<HTMLElement>('.intro');
        if (overviewTop) gsap.fromTo(overviewTop, { y: 54 }, {
          y: 0, ease: 'none',
          scrollTrigger: { trigger: overview, start: 'top 86%', end: 'top 30%', scrub: 1.25 }
        });
        if (overviewIntro) gsap.fromTo(overviewIntro, { y: 68 }, {
          y: 0, ease: 'none',
          scrollTrigger: { trigger: overview, start: 'top 48%', end: 'bottom 48%', scrub: 1.35 }
        });
      }
      if (storySection.value && storyBackdrop.value && storyCopy.value && window.matchMedia('(min-width: 901px)').matches) {
        const legacySection = storySection.value.querySelector<HTMLElement>('.legacy');
        const legacyCopy = legacySection?.querySelector<HTMLElement>('.legacy-copy');
        gsap.to({}, {
          scrollTrigger: {
            trigger: storySection.value, start: 'top top', end: 'bottom bottom', scrub: 1,
            onUpdate: (trigger) => {
              const motion = getStoryMotion(trigger.progress);
              gsap.set(storyBackdrop.value!, {
                y: motion.backdropY,
                scale: motion.backdropScale,
                rotation: motion.backdropRotation
              });
              gsap.set(storyCopy.value!, { y: motion.copyY, autoAlpha: motion.copyOpacity });
            }
          }
        });
        if (legacySection && legacyCopy) {
          // Keep Since 1997 fully visible while moving down. Only reverse scrolling
          // through the exit range is allowed to fade the copy away.
          gsap.set(legacyCopy, { autoAlpha: 1, y: 0 });
          ScrollTrigger.create({
            trigger: legacySection,
            start: 'top 88%',
            end: 'bottom 16%',
            scrub: 1.2,
            invalidateOnRefresh: true,
            onUpdate: (trigger) => {
              const lines = legacyCopy.querySelectorAll<HTMLElement>(':scope > span, :scope > strong');
              gsap.set(legacyCopy, {
                autoAlpha: 1,
                y: 0
              });
              // Reveal the two PSD lines in sequence on the way down. Scrubbing
              // the same progress in reverse naturally hides 1997 before Since.
              const progress = Math.max(0, Math.min(1, trigger.progress));
              const sinceProgress = Math.max(0, Math.min(1, progress / 0.52));
              const yearProgress = Math.max(0, Math.min(1, (progress - 0.34) / 0.66));
              if (lines[0]) gsap.set(lines[0], { autoAlpha: sinceProgress, y: (1 - sinceProgress) * 18 });
              if (lines[1]) gsap.set(lines[1], { autoAlpha: yearProgress, y: (1 - yearProgress) * 18 });
              // Keep the finished Since/1997 mark present while the brand-story copy is readable.
              gsap.set(lines, { autoAlpha: 1, y: 0 });
            },
            onRefresh: () => {
              gsap.set(legacyCopy, { autoAlpha: 1, y: 0 });
              gsap.set(legacyCopy.querySelectorAll<HTMLElement>(':scope > span, :scope > strong'), { autoAlpha: 1, y: 0 });
            }
          });
        }
      }
    });

    if (historySection.value && historyViewport.value && historyTrack.value && historyCopy.value && historyCursor.value && historyOrbitRing.value && historyWheelCursor.value && historyWheel.value) {
      const panel = historySection.value;
      const viewport = historyViewport.value;
      const track = historyTrack.value;
      const copy = historyCopy.value;
      const cursor = historyCursor.value;
      const orbitRing = historyOrbitRing.value;
      const wheelCursor = historyWheelCursor.value;
      const wheel = historyWheel.value;
      const lines = [...copy.querySelectorAll<HTMLElement>('.history-title-line')];
      const copyCn = copy.querySelector<HTMLElement>('.history-cn');
      const progressItems = [...panel.querySelectorAll<HTMLElement>('.history-progress i')];
      const desktopHistory = window.matchMedia('(min-width: 901px)');
      const historyMotion = { progress: 0 };
      let historyTargetProgress = 0;
      let historyBoundaryDistance = 0;
      let historyBoundaryDirection: -1 | 0 | 1 = 0;
      let historyExitArmed = false;
      let historyGestureStopped = true;
      let historyActive = false;
      let historyAligning = false;
      let historyLeaving = false;
      let historyExitDirection: -1 | 1 = 1;
      let historyExitUnlockTimer = 0;
      let lastScrollY = window.scrollY;
      let dampingStartedAt = -Infinity;
      let cursorPulseActive = false;
      let historyWheelRotation = 0;
      let historyOrbitRotation = 0;

      function startCursorIdle() {
        if (!desktopHistory.matches) return;
        gsap.killTweensOf(cursor);
        gsap.fromTo(cursor, { x: -5 }, { x: 5, duration: .9, ease: 'sine.inOut', repeat: -1, yoyo: true });
      }

      function spinHistoryWheel(direction: -1 | 1, deltaY = 80) {
        const rotationStep = Math.max(48, Math.min(Math.abs(deltaY) * .9, 144));
        const orbitStep = Math.max(6, Math.min(Math.abs(deltaY) * .14, 22));
        historyWheelRotation += direction * rotationStep;
        historyOrbitRotation += direction * orbitStep;
        gsap.to(wheel, { rotation: historyWheelRotation, duration: .42, ease: 'power2.out', overwrite: true });
        gsap.to(orbitRing, { rotation: historyOrbitRotation, duration: .42, ease: 'power2.out', overwrite: true });
      }

      function pulseCursor(direction: -1 | 1, deltaY = 80) {
        spinHistoryWheel(direction, deltaY);
        if (cursorPulseActive) return;
        cursorPulseActive = true;
        gsap.killTweensOf(cursor);
        gsap.timeline({
          onComplete: () => {
            cursorPulseActive = false;
            startCursorIdle();
          }
        })
          .to(cursor, { x: direction * 18, duration: .18, ease: 'power2.out' })
          .to(cursor, { x: 0, duration: .3, ease: 'back.out(1.7)' });
      }

      function renderHistoryProgress(progress: number) {
        historyMotion.progress = Math.max(0, Math.min(progress, 1));
        const motion = getTimelineMotion({
          progress: historyMotion.progress,
          panelWidth: panel.clientWidth,
          trackDistance: Math.max(0, track.scrollWidth - viewport.clientWidth),
          cursorStart: wheelCursor.offsetLeft,
          cursorWidth: wheelCursor.offsetWidth,
          copyLeft: copy.offsetLeft,
          copyWidth: copy.offsetWidth
        });
        gsap.set(viewport, { autoAlpha: 1 });
        gsap.set(track, { x: motion.trackX });
        gsap.set(copy, { x: motion.copyX, y: 0, autoAlpha: 1 });
        gsap.set(cursor, { autoAlpha: 1 });
        const wireStart = panel.clientWidth * .062;
        const wheelCenter = wheelCursor.offsetLeft + motion.cursorX + wheelCursor.offsetWidth / 2;
        wheelCursor.style.setProperty('--wire-length', `${Math.max(0, wheelCenter - wireStart)}px`);
        gsap.set(wheelCursor, { x: motion.cursorX, y: 0, autoAlpha: 1 });
        const lineReveal = getSequentialLineReveal(motion.titleRevealProgress, lines.map((line) => line.offsetWidth));
        lines.forEach((line, index) => line.style.setProperty('--reveal-progress', `${lineReveal[index] * 100}%`));
        if (copyCn) gsap.set(copyCn, { autoAlpha: .35 + motion.titleRevealProgress * .65, y: (1 - motion.titleRevealProgress) * 10 });
        const progressIndex = Math.min(progressItems.length - 1, Math.floor(historyMotion.progress * progressItems.length));
        progressItems.forEach((item, index) => item.classList.toggle('active', historyMotion.progress > 0 && index === progressIndex));
        panel.dataset.historyProgress = historyMotion.progress.toFixed(3);
      }

      function setHistoryProgress(progress: number, animate = true) {
        const nextProgress = Math.max(0, Math.min(progress, 1));
        historyTargetProgress = nextProgress;
        historyBoundaryDistance = 0;
        historyBoundaryDirection = 0;
        gsap.killTweensOf(historyMotion);
        if (!animate || Math.abs(historyMotion.progress - nextProgress) < .001) {
          renderHistoryProgress(nextProgress);
          return;
        }
        gsap.to(historyMotion, {
          progress: nextProgress,
          duration: .72,
          ease: 'power3.inOut',
          overwrite: true,
          onUpdate: () => renderHistoryProgress(historyMotion.progress),
          onComplete: () => renderHistoryProgress(nextProgress)
        });
      }

      function finishHistoryExit(direction: -1 | 1) {
        historyObserver.disable();
        historyActive = false;
        historyLeaving = true;
        historyBoundaryDistance = 0;
        historyBoundaryDirection = 0;
        const nextPanel = panel.nextElementSibling as HTMLElement | null;
        const targetY = direction > 0 && nextPanel
          ? nextPanel.offsetTop
          : Math.max(0, panel.offsetTop - window.innerHeight * .55);
        historyExitDirection = direction;
        window.clearTimeout(historyExitUnlockTimer);
        historyExitUnlockTimer = window.setTimeout(() => {
          historyLeaving = false;
          lastScrollY = window.scrollY;
        }, 700);
        gsap.to(window, {
          duration: .58,
          scrollTo: { y: targetY, autoKill: false },
          ease: 'power2.out',
          overwrite: true,
          onComplete: () => {
            window.clearTimeout(historyExitUnlockTimer);
            lastScrollY = window.scrollY;
            historyLeaving = false;
          }
        });
      }

      function scrubHistoryProgress(deltaY: number) {
        const direction = Math.sign(deltaY);
        const atStart = historyTargetProgress <= .001 && historyMotion.progress <= .012;
        const atEnd = historyTargetProgress >= .999 && historyMotion.progress >= .988;
        if ((direction < 0 && atStart) || (direction > 0 && atEnd)) {
          if (historyBoundaryDirection !== direction) {
            historyBoundaryDistance = 0;
            historyBoundaryDirection = direction as -1 | 1;
          }
          if (direction > 0 && !historyExitArmed) {
            historyBoundaryDistance = 0;
            return;
          }
          const boundaryStep = direction > 0 ? 55 : 70;
          const boundaryThreshold = direction > 0 ? 110 : 140;
          historyBoundaryDistance += Math.min(Math.abs(deltaY), boundaryStep);
          if (historyBoundaryDistance >= boundaryThreshold) finishHistoryExit(direction as -1 | 1);
          return;
        }
        historyBoundaryDistance = 0;
        historyBoundaryDirection = 0;
        const pixelsForTimeline = Math.max(4000, window.innerHeight * 4.4);
        const boundedDelta = Math.max(-100, Math.min(deltaY, 100));
        historyTargetProgress = Math.max(0, Math.min(historyTargetProgress + boundedDelta / pixelsForTimeline, 1));
        if (historyTargetProgress < .999) historyExitArmed = false;
        gsap.to(historyMotion, {
          progress: historyTargetProgress,
          duration: .3,
          ease: 'power2.out',
          overwrite: true,
          onUpdate: () => renderHistoryProgress(historyMotion.progress),
          onComplete: () => {
            renderHistoryProgress(historyTargetProgress);
            if (historyTargetProgress >= .999 && historyGestureStopped) historyExitArmed = true;
          }
        });
      }

      const historyObserver = Observer.create({
        target: window,
        type: 'wheel,touch,pointer',
        tolerance: 3,
        preventDefault: true,
        allowClicks: true,
        onChangeY: (observer) => {
          if (!historyActive || historyAligning) return;
          const direction = Math.sign(observer.deltaY) as -1 | 0 | 1;
          if (!direction) return;
          pulseCursor(direction, observer.deltaY);
          historyGestureStopped = false;
          const elapsed = performance.now() - dampingStartedAt;
          const damping = Math.max(.16, Math.min(.16 + elapsed / 600 * .84, 1));
          scrubHistoryProgress(observer.deltaY * damping);
        },
        onStopDelay: .2,
        onStop: () => {
          historyGestureStopped = true;
          if (historyTargetProgress >= .999 && historyMotion.progress >= .988) historyExitArmed = true;
        }
      });
      historyObserver.disable();

      function activateHistory(progress: 0 | 1) {
        if (!desktopHistory.matches || historyActive || historyLeaving) return;
        historyActive = true;
        historyAligning = true;
        historyExitArmed = false;
        historyGestureStopped = true;
        setHistoryProgress(progress, false);
        historyObserver.enable();
        const distance = Math.abs(window.scrollY - panel.offsetTop);
        gsap.to(window, {
          duration: Math.max(.3, Math.min(.3 + distance / 2400, .46)),
          scrollTo: { y: panel.offsetTop, autoKill: false },
          ease: 'power2.out',
          overwrite: true,
          onComplete: () => {
            window.scrollTo(0, panel.offsetTop);
            historyAligning = false;
            dampingStartedAt = performance.now();
          }
        });
      }

      function handleHistoryScroll() {
        const currentScrollY = window.scrollY;
        if (!desktopHistory.matches) {
          lastScrollY = currentScrollY;
          return;
        }
        if (document.documentElement.dataset.aboutPanelJump === 'true') {
          historyObserver.disable();
          historyActive = false;
          historyAligning = false;
          historyLeaving = true;
          lastScrollY = currentScrollY;
          return;
        }
        if (historyLeaving) {
          const leftPanelTop = historyExitDirection > 0
            ? currentScrollY > panel.offsetTop + 8
            : currentScrollY < panel.offsetTop - 8;
          if (leftPanelTop) historyLeaving = false;
          lastScrollY = currentScrollY;
          return;
        }
        if (historyActive) {
          lastScrollY = currentScrollY;
          return;
        }
        if (!historyLeaving) {
          const enteringFromAbove = currentScrollY > lastScrollY
            && lastScrollY < panel.offsetTop - 140
            && currentScrollY >= panel.offsetTop - 140;
          const lowerEntryLine = panel.offsetTop + panel.offsetHeight - 140;
          const enteringFromBelow = currentScrollY < lastScrollY
            && lastScrollY > lowerEntryLine
            && currentScrollY <= lowerEntryLine;
          const startsOnHistory = Math.abs(currentScrollY - panel.offsetTop) <= 2;
          if (enteringFromBelow) {
            activateHistory(1);
          } else if (enteringFromAbove || startsOnHistory) {
            activateHistory(0);
          }
        }
        lastScrollY = currentScrollY;
      }

      function handleHistoryKeydown(event: KeyboardEvent) {
        if (!desktopHistory.matches || !historyActive || historyAligning) return;
        if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(event.key)) {
          event.preventDefault();
          pulseCursor(1);
          if (historyTargetProgress < .999) setHistoryProgress(Math.min(1, historyTargetProgress + .25));
          else finishHistoryExit(1);
        } else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(event.key)) {
          event.preventDefault();
          pulseCursor(-1);
          if (historyTargetProgress > .001) setHistoryProgress(Math.max(0, historyTargetProgress - .25));
          else finishHistoryExit(-1);
        }
      }

      function handleHistoryResize() {
        if (desktopHistory.matches) {
          renderHistoryProgress(historyMotion.progress);
          startCursorIdle();
        }
        else {
          historyObserver.disable();
          historyActive = false;
          historyWheelRotation = 0;
          historyOrbitRotation = 0;
          gsap.killTweensOf([cursor, orbitRing, wheelCursor, wheel]);
          gsap.set([track, copy, cursor, orbitRing, wheelCursor, wheel], { clearProps: 'transform,opacity,visibility' });
          wheelCursor.style.removeProperty('--wire-length');
          lines.forEach((line) => line.style.removeProperty('--reveal-progress'));
          if (copyCn) gsap.set(copyCn, { clearProps: 'transform,opacity,visibility' });
        }
      }

      function handlePanelJump(event: Event) {
        const targetPanel = (event as CustomEvent<{ panel?: HTMLElement }>).detail?.panel;
        // A section-nav jump can cross the full-screen history panel even when
        // it has not activated yet. Suspend its Observer for every jump away
        // from this panel so it cannot seize the in-flight scroll animation.
        if (targetPanel === panel) return;
        gsap.killTweensOf(window);
        historyObserver.disable();
        historyActive = false;
        historyAligning = false;
        historyLeaving = true;
        historyExitDirection = targetPanel && targetPanel.offsetTop < panel.offsetTop ? -1 : 1;
        window.clearTimeout(historyExitUnlockTimer);
        historyExitUnlockTimer = window.setTimeout(() => {
          historyLeaving = false;
          lastScrollY = window.scrollY;
        }, 900);
      }

      window.addEventListener('scroll', handleHistoryScroll, { passive: true });
      window.addEventListener('keydown', handleHistoryKeydown);
      window.addEventListener('resize', handleHistoryResize);
      window.addEventListener('about-panel-jump', handlePanelJump);
      desktopHistory.addEventListener('change', handleHistoryResize);
      if (desktopHistory.matches) {
        renderHistoryProgress(0);
        startCursorIdle();
        if (window.location.hash === '#history') window.requestAnimationFrame(() => activateHistory(0));
        else window.requestAnimationFrame(handleHistoryScroll);
      }
      stopHistoryMotion = () => {
        window.removeEventListener('scroll', handleHistoryScroll);
        window.removeEventListener('keydown', handleHistoryKeydown);
        window.removeEventListener('resize', handleHistoryResize);
        window.removeEventListener('about-panel-jump', handlePanelJump);
        desktopHistory.removeEventListener('change', handleHistoryResize);
        window.clearTimeout(historyExitUnlockTimer);
        historyObserver.kill();
        gsap.killTweensOf(historyMotion);
        gsap.killTweensOf([cursor, orbitRing, wheelCursor, wheel]);
      };
    }
  }
});

onMounted(() => {
  window.addEventListener('keydown', handleGalleryKeydown);
});

onBeforeUnmount(() => {
  aboutDisposed = true;
  window.removeEventListener('keydown', handleGalleryKeydown);
  document.body.classList.remove('gallery-is-open');
  stopHistoryMotion?.();
  stopHistoryMotion = undefined;
  gsapContext?.revert();
  gsapContext = undefined;
});
useSeoMeta({ title: '关于我们', description: '瑞钧智科企业介绍、发展历程、荣誉资质与客户现场。' });
</script>

<template>
  <div class="about-page">
    <SiteHeader />
    <AboutSectionIndicator />
    <main>
      <div ref="storySection" class="about-story">
         <div ref="storyBackdrop" class="about-story-backdrop" :style="heroBackdropStyle" aria-hidden="true" :data-cms-preview-collection="heroContent.cms_collection || undefined" :data-cms-preview-item-id="heroContent.cms_item_id || undefined" data-cms-preview-key="hero" :data-cms-preview-field-path="heroBackdrop.fieldPath" data-cms-preview-media-slot="background" data-cms-preview-placement-key="about.hero.background" data-cms-preview-media-role="background" data-cms-preview-allow-default="true"></div>
        <section class="about-hero" v-bind="sectionPresentationAttributes(heroContent)" data-cms-preview-key="hero" data-about-panel aria-labelledby="about-title">
          <div class="hero-media"><img class="cms-media" :src="heroBackground.path" :data-cms-preview-field-path="heroBackground.fieldPath" data-cms-preview-placement-key="about.hero.background" data-cms-preview-media-role="background" :alt="heroBackground.alt || '瑞钧智科中走丝线切割机床'"></div>
          <img class="hero-machine cms-media" :src="heroMachine.path" :data-cms-preview-field-path="heroMachine.fieldPath" data-cms-preview-placement-key="about.hero.foreground" data-cms-preview-media-role="foreground" :alt="heroMachine.alt" aria-hidden="true">
<div ref="storyCopy" class="hero-copy cms-positioned"><p><strong data-cms-preview-field="kicker" data-cms-preview-field-path="kicker">{{ heroNumber }}</strong><span data-cms-preview-field="description" data-cms-preview-field-path="description">{{ heroUnit }}</span></p><h1 id="about-title" class="cms-styled-text" data-cms-preview-field="title" data-cms-preview-field-path="title">{{ title }}</h1></div>
        </section>
        <section class="legacy" v-bind="sectionPresentationAttributes(brandStory)" data-cms-preview-key="brand-story" data-about-panel aria-label="瑞钧智科创立于 1997 年">
          <div class="legacy-copy"><span data-cms-preview-field="kicker" data-cms-preview-field-path="kicker">{{ brandStoryKicker }}</span><strong data-cms-preview-field="description" data-cms-preview-field-path="description">{{ brandStoryYear }}</strong></div>
          <div class="legacy-story cms-positioned" aria-labelledby="brand-story-title" data-cms-preview-field="body" data-cms-preview-field-path="body" data-cms-preview-inline-edit="false">
<h2 id="brand-story-title" class="cms-styled-text" data-cms-preview-field="title" data-cms-preview-field-path="title">{{ brandStoryTitle }}</h2>
<p v-for="(paragraph, index) in brandStoryParagraphs" :key="index">{{ paragraph }}</p>
          </div>
        </section>
      </div>
<section class="about-overview" v-bind="sectionPresentationAttributes(overviewContent)" data-cms-preview-key="overview" data-about-panel><div class="overview-inner cms-positioned"><div class="overview-top about-reveal"><p data-cms-preview-field="kicker" data-cms-preview-field-path="kicker">{{ overviewContent.kicker }}</p><div><p class="cms-styled-text" data-cms-preview-field="title" data-cms-preview-field-path="title">{{ overviewContent.title }}</p><p data-cms-preview-field="description" data-cms-preview-field-path="description">{{ overviewContent.description }}</p><ul><li v-for="(item, index) in overviewContent.items" :key="item.label" :data-cms-preview-field-path="`items.${index}.label`">{{ item.label }}</li></ul></div></div><div class="intro about-reveal"><div><p data-cms-preview-field="body" data-cms-preview-field-path="body">{{ overviewBody }}</p></div><img class="cms-media" :src="overviewImage.path" :alt="overviewImage.alt" :data-cms-preview-field-path="overviewImage.fieldPath" data-cms-preview-media-role="background"></div></div></section>
       <section id="history" ref="historySection" class="about-history history lifecycle-panel" v-bind="sectionPresentationAttributes(historyContent)" :style="historyBackground ? { backgroundImage: `url(${historyBackground.path})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined" :data-cms-preview-field-path="historyBackground?.fieldPath" data-cms-preview-placement-key="about.timeline.background" data-cms-preview-media-role="background" data-cms-preview-key="history" data-about-panel aria-labelledby="history-title"><div ref="historyCopy" class="history-copy cms-positioned"><p id="history-title" class="history-en" data-cms-preview-field="kicker" data-cms-preview-field-path="kicker"><span v-for="line in historyEnglishLines" :key="line" class="history-title-line">{{ line }}</span></p><p class="cms-section-title history-cn cms-styled-text" data-cms-preview-field="title" data-cms-preview-field-path="title">{{ historyContent.title }}</p></div><div ref="historyViewport" class="history-viewport"><div ref="historyTrack" class="history-track"><article v-for="(milestone, index) in milestones" :key="milestone[0]" class="history-event" :data-cms-preview-key="milestone[5] || undefined" :data-cms-preview-collection="milestone[6] ? 'milestones' : undefined" :data-cms-preview-item-id="milestone[6] || undefined"><b data-cms-preview-field-path="year">{{ milestone[0] }}</b><span><span data-cms-preview-field-path="event">{{ milestone[1] }}</span><template v-if="!milestone[6] && milestone[2]"><br>（{{ milestone[2] }}）</template></span></article></div></div><i ref="historyWheelCursor" class="history-wheel-cursor" aria-hidden="true"><img ref="historyWheel" :src="historyIcon.path" data-cms-preview-field="icon" :data-cms-preview-field-path="historyIcon.fieldPath" data-cms-preview-placement-key="about.timeline.icon" data-cms-preview-media-role="icon" :alt="historyIcon.alt || ''"></i><div class="history-orbit" aria-hidden="true"><i ref="historyOrbitRing" class="history-orbit-ring"></i><i ref="historyCursor" class="history-cursor"></i></div><div class="history-progress" aria-hidden="true"><i></i><i></i><i></i></div><p class="history-hint" data-cms-preview-field="label" data-cms-preview-field-path="label">{{ historyHint }} <span>→</span></p></section>
      <section class="factory about-chapter" v-bind="sectionPresentationAttributes(factoryContent)" data-cms-preview-key="factory" data-about-panel aria-labelledby="factory-title"><div class="section-inner cms-positioned"><p v-bind="fieldPresentationAttributes(factoryContent, 'kicker')" data-cms-preview-field="kicker" data-cms-preview-field-path="kicker" data-cms-preview-position-field-path="field_presentation.kicker">{{ factoryContent.kicker || 'FACTORY' }}</p><h2 id="factory-title" class="cms-section-title cms-styled-text" v-bind="fieldPresentationAttributes(factoryContent, 'title')" data-cms-preview-field="title" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">{{ factoryContent.title }}</h2><div class="factory-grid" aria-label="瑞钧厂区风貌"><figure v-for="(asset, index) in factoryGallery" :key="asset.mediaSlot || asset.fieldPath" role="button" tabindex="0" :aria-label="`放大查看${asset.alt || factoryContent.title}`" @click="openGallery(factoryGallery, index, factoryContent.title)" @keydown.enter.prevent="openGallery(factoryGallery, index, factoryContent.title)" @keydown.space.prevent="openGallery(factoryGallery, index, factoryContent.title)"><img class="cms-media" :src="asset.path" :data-cms-preview-field-path="asset.fieldPath" :data-cms-preview-media-slot="asset.mediaSlot" data-cms-preview-placement-key="about.gallery.image" data-cms-preview-media-role="gallery" :alt="asset.alt" loading="lazy" decoding="async"></figure></div></div></section>
      <section class="credentials about-chapter" v-bind="sectionPresentationAttributes(certificatesContent)" data-cms-preview-key="certificates" data-about-panel aria-labelledby="certificate-title"><div class="section-inner cms-positioned"><p v-bind="fieldPresentationAttributes(certificatesContent, 'kicker')" data-cms-preview-field="kicker" data-cms-preview-field-path="kicker" data-cms-preview-position-field-path="field_presentation.kicker">{{ certificatesContent.kicker || 'QUALIFICATION' }}</p><h2 id="certificate-title" class="cms-section-title cms-styled-text" v-bind="fieldPresentationAttributes(certificatesContent, 'title')" data-cms-preview-field="title" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">{{ certificatesContent.title }}</h2><div class="document-row certificate-row"><button v-for="(asset, index) in certificates" :key="asset.path" class="gallery-thumb" type="button" data-cms-preview-collection="qualifications" :data-cms-preview-item-id="asset.itemId || undefined" :data-cms-preview-key="asset.sourceKey || undefined" :aria-label="`放大查看${asset.alt || certificatesContent.title}`" @click="openGallery(certificates, index, certificatesContent.title)"><img class="cms-media" :src="asset.path" :alt="asset.alt" :data-cms-preview-field-path="asset.fieldPath" data-cms-preview-media-role="gallery" data-cms-preview-placement-key="qualification.image" loading="lazy" decoding="async"><span class="qualification-name cms-preview-name" data-cms-preview-field="name" :data-cms-preview-field-path="asset.nameFieldPath">{{ asset.name }}</span></button></div></div></section>
      <section class="credentials light about-chapter" v-bind="sectionPresentationAttributes(honorContent)" data-cms-preview-key="honors" data-about-panel aria-labelledby="honor-title"><div class="section-inner cms-positioned"><p v-bind="fieldPresentationAttributes(honorContent, 'kicker')" data-cms-preview-field="kicker" data-cms-preview-field-path="kicker" data-cms-preview-position-field-path="field_presentation.kicker">{{ honorContent.kicker || 'HONOR' }}</p><h2 id="honor-title" class="cms-section-title cms-styled-text" v-bind="fieldPresentationAttributes(honorContent, 'title')" data-cms-preview-field="title" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">{{ honorContent.title }}</h2><div class="photo-row honor-row"><button v-for="(asset, index) in honors" :key="asset.path" class="gallery-thumb" type="button" data-cms-preview-collection="qualifications" :data-cms-preview-item-id="asset.itemId || undefined" :data-cms-preview-key="asset.sourceKey || undefined" :aria-label="`放大查看${asset.alt || '荣誉证书'}`" @click="openGallery(honors, index, '荣誉证书')"><img class="cms-media" :src="asset.path" :alt="asset.alt" :data-cms-preview-field-path="asset.fieldPath" data-cms-preview-media-role="gallery" data-cms-preview-placement-key="qualification.image" loading="lazy" decoding="async"><span class="qualification-name cms-preview-name" data-cms-preview-field="name" :data-cms-preview-field-path="asset.nameFieldPath">{{ asset.name }}</span></button></div></div></section>
      <section class="credentials about-chapter" v-bind="sectionPresentationAttributes(patentContent)" data-cms-preview-key="patents" data-about-panel aria-labelledby="patent-title"><div class="section-inner cms-positioned"><p v-bind="fieldPresentationAttributes(patentContent, 'kicker')" data-cms-preview-field="kicker" data-cms-preview-field-path="kicker" data-cms-preview-position-field-path="field_presentation.kicker">{{ patentContent.kicker || 'PATENTS' }}</p><h2 id="patent-title" class="cms-section-title cms-styled-text" v-bind="fieldPresentationAttributes(patentContent, 'title')" data-cms-preview-field="title" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">{{ patentContent.title }} <span v-if="patentContent.description" v-bind="fieldPresentationAttributes(patentContent, 'description')" data-cms-preview-field="description" data-cms-preview-field-path="description" data-cms-preview-position-field-path="field_presentation.description">{{ patentContent.description }}</span></h2><div class="document-row patent-row"><button v-for="(asset, index) in patents" :key="asset.path" class="gallery-thumb" type="button" data-cms-preview-collection="qualifications" :data-cms-preview-item-id="asset.itemId || undefined" :data-cms-preview-key="asset.sourceKey || undefined" :aria-label="`放大查看${asset.alt || '专利证书'}`" @click="openGallery(patents, index, '专利证书')"><img class="cms-media" :src="asset.path" :alt="asset.alt" :data-cms-preview-field-path="asset.fieldPath" data-cms-preview-media-role="gallery" data-cms-preview-placement-key="qualification.image" loading="lazy" decoding="async"><span class="qualification-name cms-preview-name" data-cms-preview-field="name" :data-cms-preview-field-path="asset.nameFieldPath">{{ asset.name }}</span></button></div></div></section>
<section class="partners light about-chapter" v-bind="sectionPresentationAttributes(partnersContent)" data-cms-preview-key="partners" data-about-panel aria-labelledby="partners-title"><div class="section-inner cms-positioned"><p v-bind="fieldPresentationAttributes(partnersContent, 'kicker')" data-cms-preview-field="kicker" data-cms-preview-field-path="kicker" data-cms-preview-position-field-path="field_presentation.kicker">{{ partnersContent.kicker || 'PARTNERS' }}</p><h2 id="partners-title" class="cms-section-title cms-styled-text" v-bind="fieldPresentationAttributes(partnersContent, 'title')" data-cms-preview-field="title" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">{{ partnersContent.title }}</h2><div class="partners-gallery"><button v-for="(asset, index) in partnerImages" :key="asset.path" class="gallery-thumb" type="button" :aria-label="`放大查看${asset.alt || partnersContent.title}`" @click="openGallery(partnerImages, index, partnersContent.title)"><img class="partners-image cms-media" :src="asset.path" :alt="asset.alt || partnersContent.title" :data-cms-preview-field-path="asset.fieldPath" :data-cms-preview-position-field-path="asset.positionFieldPath" data-cms-preview-placement-key="about.partner.image" data-cms-preview-media-role="gallery" loading="lazy" decoding="async"></button></div></div></section>
      <section class="clients about-chapter" data-about-panel aria-label="客户现场"><div class="section-inner"><div v-bind="sectionPresentationAttributes(domesticClientsContent)" class="cms-positioned" data-cms-preview-key="clients-domestic"><p v-bind="fieldPresentationAttributes(domesticClientsContent, 'kicker')" data-cms-preview-field="kicker" data-cms-preview-field-path="kicker" data-cms-preview-position-field-path="field_presentation.kicker">{{ domesticClientsContent.kicker || 'CLIENTS' }}</p><h3 class="cms-section-title cms-styled-text" v-bind="fieldPresentationAttributes(domesticClientsContent, 'title')" data-cms-preview-field="title" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">{{ domesticClientsContent.title }}</h3><div class="photo-row client-row"><button v-for="(asset, index) in domesticClients" :key="asset.mediaSlot || asset.fieldPath" class="gallery-thumb" type="button" :aria-label="`放大查看${asset.alt}`" @click="openGallery(domesticClients, index, domesticClientsContent.title)"><img class="cms-media" :src="asset.path" :alt="asset.alt" :data-cms-preview-field-path="asset.fieldPath" :data-cms-preview-media-slot="asset.mediaSlot" :data-cms-preview-position-field-path="asset.positionFieldPath" data-cms-preview-media-role="gallery" data-cms-preview-placement-key="about.client.image" loading="lazy" decoding="async"></button></div></div><div v-bind="sectionPresentationAttributes(globalClientsContent)" class="cms-positioned" data-cms-preview-key="clients-global"><h3 class="cms-section-title cms-styled-text" v-bind="fieldPresentationAttributes(globalClientsContent, 'title')" data-cms-preview-field="title" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">{{ globalClientsContent.title }}</h3><div class="photo-row client-row"><button v-for="(asset, index) in globalClients" :key="asset.mediaSlot || asset.fieldPath" class="gallery-thumb" type="button" :aria-label="`放大查看${asset.alt}`" @click="openGallery(globalClients, index, globalClientsContent.title)"><img class="cms-media" :src="asset.path" :alt="asset.alt" :data-cms-preview-field-path="asset.fieldPath" :data-cms-preview-media-slot="asset.mediaSlot" :data-cms-preview-position-field-path="asset.positionFieldPath" data-cms-preview-media-role="gallery" data-cms-preview-placement-key="about.client.image" loading="lazy" decoding="async"></button></div></div></div></section>
    </main>
    <footer v-if="false" class="about-footer" data-about-panel>
      <div class="about-footer-inner">
        <div class="about-footer-brand"><NuxtLink to="/" aria-label="返回瑞钧智科首页"><img src="/assets/ruijun-logo.png" alt="瑞钧智科 RUIJUN"></NuxtLink></div>
<div><h2>产品中心</h2><NuxtLink to="/product">灵动切割工作站</NuxtLink><NuxtLink to="/product">FR-XS(auto)</NuxtLink><NuxtLink to="/product">FR-XS(pro)</NuxtLink><NuxtLink to="/product">FT-XS(pro)</NuxtLink><NuxtLink to="/product">FR-Y</NuxtLink><NuxtLink to="/product">FL-XS(pro)</NuxtLink></div>
        <div><h2>先进智造</h2><NuxtLink to="/manufacturing">CNC车间</NuxtLink><NuxtLink to="/manufacturing">钣金车间</NuxtLink><NuxtLink to="/manufacturing">装配车间</NuxtLink></div>
        <div><h2>关于我们</h2><a href="#certificate-title">荣誉资质认证</a><a href="#history">品牌发展历程</a></div>
        <address><p>常熟工厂：江苏省苏州市常熟市沙家浜儒浜路78号</p><p>昆山工厂：江苏省苏州市昆山市巴城苏杭路88号</p><p>热线：13738375470<br>外贸：17751119936</p><p>国内邮箱：ksrjjx@126.com<br>外贸邮箱：kylewuedm@gmail.com</p></address>
        <div class="about-footer-service"><span>大批量采购</span><strong>你有量<br>我有价</strong><a href="tel:15050166844">15050166844</a></div>
      </div>
    </footer>
    <PsdFooter />
    <Teleport to="body">
      <div v-if="galleryOpen" class="document-lightbox" role="dialog" aria-modal="true" :aria-label="galleryTitle" @click.self="closeGallery">
        <button class="document-lightbox-close" type="button" aria-label="关闭大图" @click="closeGallery">×</button>
        <button class="document-lightbox-arrow prev" type="button" aria-label="上一张" @click="moveGallery(-1)">←</button>
        <figure class="document-lightbox-figure">
          <img v-if="galleryCurrent" :src="galleryCurrent.path" :alt="galleryCurrent.alt || galleryTitle">
          <figcaption>{{ galleryTitle }} {{ galleryIndex + 1 }} / {{ galleryItems.length }}</figcaption>
        </figure>
        <button class="document-lightbox-arrow next" type="button" aria-label="下一张" @click="moveGallery(1)">→</button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.about-page { overflow: hidden; background: #090909; color: #fff; font-family: Arial, "Microsoft YaHei", sans-serif; }.about-page main{overflow:visible}.about-hero { position: relative; min-height: calc(100vh - 79px); isolation: isolate; overflow: hidden; }.hero-media { position: absolute; inset: 0; z-index: -2; }.hero-media::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, #080808 0%, rgb(8 8 8 / 42%) 48%, #080808 100%); }.hero-media img { width: 100%; height: 100%; object-fit: cover; }.hero-machine { position: absolute; right: 5%; bottom: 2%; width: min(52vw, 780px); max-height: 76%; object-fit: contain; filter: drop-shadow(0 25px 28px rgb(0 0 0 / 42%)); }.hero-copy { position: relative; max-width: 1280px; margin: 0 auto; padding: 25vh 32px 0; }.hero-copy p { display: flex; flex-direction: column; margin: 0 0 18px; }.hero-copy strong { color: #e03232; font-size: clamp(70px, 10vw, 156px); line-height: .8; font-weight: 500; }.hero-copy span { margin-top: 14px; color: rgb(255 255 255 / 70%); }.hero-copy h1 { margin: 0; font-size: clamp(42px, 5.2vw, 76px); line-height: 1.12; font-weight: 500; white-space: pre-line; }.legacy { min-height: 76vh; padding: 12vh max(32px, calc((100vw - 1216px) / 2)); display: flex; justify-content: space-between; align-items: center; background: #efefed; color: #1b1b1b; }.legacy p { margin: 0; font-size: clamp(31px, 4vw, 64px); line-height: 1.07; }.legacy p span{display:block}.legacy div { display: flex; flex-direction: column; align-items: flex-end; }.legacy span { font-size: 18px; }.legacy strong { font-size: clamp(80px, 14vw, 210px); line-height: .8; font-weight: 400; }.about-overview { background: #efefed; color: #171717; padding: 100px 0; }.overview-inner, .section-inner { max-width: 1216px; margin: 0 auto; padding-left: 32px; padding-right: 32px; }.overview-top { display: grid; grid-template-columns: .9fr 1.1fr; gap: 80px; }.overview-top > p { margin: 0; font-size: 24px; }.overview-top strong { display: block; margin-top: 10px; font-size: clamp(58px, 8vw, 108px); line-height: .88; font-weight: 500; }.overview-top div p { margin: 0 0 13px; font-size: 17px; }.overview-top ul { padding: 0; margin: 34px 0 0; list-style: none; }.overview-top li { padding: 12px 0; border-top: 1px solid rgb(0 0 0 / 17%); }.intro { display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 8vw; margin-top: 116px; }.intro p { font-size: 17px; line-height: 1.85; }.intro img { width: 100%; max-height: 520px; object-fit: cover; }.history { position: relative; height: 100vh; min-height: 660px; overflow: hidden; background: #efefed; color: #1b1b1b; }.history-copy { position: absolute; z-index: 2; top: 13%; left: max(32px, calc((100vw - 1216px) / 2)); width: min(660px, 54vw); }.history-copy p { margin: 0; font-size: clamp(38px, 5.2vw, 79px); line-height: 1.02; color: #a7a7a4; }.history-copy span { display: block; margin-top: 22px; color: #555; font-size: 17px; }.history-viewport { position: absolute; left: 0; right: 0; bottom: 16%; overflow: visible; }.history-track { display: flex; gap: 10vw; width: max-content; padding-left: 88vw; }.history-track article { width: min(290px, 27vw); }.history-track b { display: block; margin-bottom: 18px; color: #d22323; font-size: clamp(46px, 5vw, 78px); line-height: .9; font-weight: 500; }.history-track h3 { margin: 0; font-size: 20px; font-weight: 500; }.history-track p { color: #666; }.history > i { position: absolute; z-index: 3; left: 0; bottom: calc(16% - 52px); display: block; width: 74px; height: 2px; background: #d22323; }.history > i::after { content: ""; position: absolute; right: -1px; top: -4px; width: 9px; height: 9px; border-top: 2px solid #d22323; border-right: 2px solid #d22323; transform: rotate(45deg); }.history-progress{position:absolute;z-index:5;right:6.2%;bottom:38px;display:none;gap:7px}.history-progress i{width:26px;height:2px;background:#bbbcb9;transition:width .3s ease,background .3s ease}.history-progress i.active{width:48px;background:#ef2630}.history-hint{position:absolute;z-index:5;bottom:27px;left:6.2%;margin:0;color:#999b9e;font-size:9px}.history-hint span{margin-left:10px;color:#ef2630;font-size:18px}.factory, .credentials, .partners { padding: 110px 0; }.factory { background: #efefed; color: #161616; }.section-inner > p { margin: 0; color: #d22323; font-size: 12px; }.section-inner h2 { margin: 12px 0 42px; font-size: clamp(33px, 4vw, 54px); font-weight: 500; }.factory-slider { position: relative; aspect-ratio: 16 / 8.1; overflow: hidden; background: #ddd; }.factory-slider:focus-visible{outline:2px solid #ef2630;outline-offset:4px}.factory-slider figure { position: absolute; inset: 0; margin: 0; opacity: 0; clip-path: inset(0 100% 0 0); transition: clip-path 1.5s cubic-bezier(.4, 0, .2, 1), opacity .3s ease; }.factory-slider figure.active { z-index: 1; opacity: 1; clip-path: inset(0); }.factory-slider img { width: 100%; height: 100%; object-fit: cover; }.slider-controls { position: absolute; z-index: 2; right: 24px; bottom: 22px; display: flex; align-items: center; gap: 15px; }.slider-controls > button { width: 36px; height: 36px; border: 1px solid rgb(255 255 255 / 65%); background: rgb(0 0 0 / 25%); color: #fff; font-size: 19px; }.slider-controls div { display: flex; gap: 8px; }.slider-controls div button { width: 7px; height: 7px; padding: 0; border: 0; border-radius: 50%; background: rgb(255 255 255 / 55%); }.slider-controls div button.active { background: #fff; }.credentials.dark { background: #101010; }.credentials.light, .partners.light { background: #efefed; color: #161616; }.document-row, .photo-row { display: flex; gap: 18px; overflow-x: auto; padding: 8px 4px 25px; scrollbar-width: thin; }.document-row img, .photo-row img { flex: 0 0 auto; object-fit: cover; transition: transform .25s ease, box-shadow .25s ease; }.document-row img { width: 195px; aspect-ratio: .72; }.photo-row img { width: 270px; aspect-ratio: 1.23; }.document-row img:hover, .photo-row img:hover { transform: translateY(-10px); box-shadow: 0 22px 32px rgb(0 0 0 / 25%); }.credentials h2 span { margin-left: 12px; color: inherit; font-size: 15px; font-weight: 400; opacity: .65; }.partners > .section-inner > img { width: 100%; display: block; }.partners { padding-bottom: 130px; }.about-footer{min-height:540px;padding:105px 0 70px;color:#6f7276;background:#0c0c0d}.about-footer-inner{width:min(1500px,80vw);margin:0 auto;display:grid;grid-template-columns:1.35fr repeat(3,.62fr) 1.3fr .75fr;gap:34px;align-items:start}.about-footer-brand img{width:250px;max-width:100%}.about-footer-brand p{margin:24px 0 0;font-size:13px}.about-footer h2{margin:0 0 23px;color:#ef2630;font-size:18px;font-weight:500}.about-footer a{display:block;margin-bottom:8px;color:#777a7e;font-size:13px;text-decoration:none}.about-footer a:hover{color:#fff}.about-footer address{padding-top:84px;font-style:normal;font-size:12px;line-height:1.75}.about-footer address p{margin:0 0 18px}.about-footer-service{padding:24px;color:#9da0a3;background:#171719;text-align:center}.about-footer-service span{display:block;font-size:12px}.about-footer-service strong{display:block;margin:10px 0;color:#0ec8d7;font-size:25px;line-height:1.1}.about-footer-service a{color:#c7c9ca;font-size:12px}
@media (max-width: 760px) { .hero-copy { padding: 16vh 20px 0; }.hero-machine { right: -16%; width: 105vw; bottom: 12%; opacity: .82; }.legacy { min-height: 56vh; padding: 80px 20px; flex-direction: column; align-items: flex-start; gap: 80px; }.legacy div { align-items: flex-start; }.overview-inner, .section-inner { padding-left: 20px; padding-right: 20px; }.about-overview, .factory, .credentials, .partners { padding: 70px 0; }.overview-top, .intro { grid-template-columns: 1fr; gap: 32px; }.intro { margin-top: 72px; }.history { height: auto; min-height: 0; padding: 80px 20px; }.history-copy { position: relative; top: auto; left: auto; width: auto; }.history-copy p { font-size: 40px; }.history-viewport { position: relative; left: auto; right: auto; bottom: auto; overflow-x: auto; margin-top: 80px; }.history-track { gap: 42px; padding-left: 0; padding-right: 50px; transform: none !important; }.history-track article { width: 220px; }.history > i { display: none; }.history-progress{display:none}.history-hint{position:static;margin-top:30px}.factory-slider { aspect-ratio: 1 / 1.08; }.document-row img { width: 154px; }.photo-row img { width: 226px; }.credentials h2 span { display: block; margin: 10px 0 0; }.about-footer{padding:70px 0 45px}.about-footer-inner{width:calc(100% - 40px);grid-template-columns:1fr;gap:30px}.about-footer address{padding-top:0}.about-footer-service{text-align:left} }
.about-page { overflow-x: clip; overflow-y: visible; }
.history-copy p{display:grid;row-gap:8px}
.history-title-line{display:block;width:max-content;max-width:100%;color:transparent;background:linear-gradient(90deg,#25272a 0 var(--line-reveal,0%),#a7a7a4 var(--line-reveal,0%) 100%);background-clip:text;white-space:nowrap}
.about-chapter,.about-chapter.light{background:#fbfaf7!important;color:#232528!important}
.about-chapter .section-inner>p{display:none}
.about-chapter .section-inner h2{margin:0 0 30px;color:#232528;font-size:clamp(40px,4.4vw,64px);line-height:1.02;font-weight:650}
.about-chapter .section-inner h2::after{content:"";display:inline-block;width:clamp(70px,11vw,170px);height:2px;margin:0 0 .18em 22px;background:#ef2630}
.about-chapter .section-inner h2 span{display:block;margin:13px 0 0;color:#96989b;font-size:14px;line-height:1.4;font-weight:400}
.certificate-row,.honor-row,.patent-row,.client-row{display:grid;gap:clamp(16px,1.45vw,28px);overflow:visible;padding:20px 8px 34px;align-items:center}
.certificate-row{grid-template-columns:repeat(7,minmax(0,1fr))}.honor-row,.client-row{grid-template-columns:repeat(5,minmax(0,1fr))}.patent-row{grid-template-columns:repeat(8,minmax(0,1fr))}
.certificate-row img,.honor-row img,.patent-row img{display:block;width:100%;min-width:0;height:auto;max-height:55vh;object-fit:contain;object-position:center bottom;border:1px solid rgb(54 58 62/12%);background:#fff;box-shadow:0 3px 9px rgb(28 31 35/10%),0 1px 2px rgb(28 31 35/8%);transform-origin:center bottom;transition:transform .42s cubic-bezier(.22,.8,.24,1),box-shadow .42s ease}
.certificate-row img:hover,.honor-row img:hover,.patent-row img:hover{z-index:2;transform:translateY(-14px) scale(1.025);box-shadow:0 24px 42px rgb(28 31 35/24%),0 8px 16px rgb(28 31 35/12%)}
.qualification-name{display:block;margin-top:8px;color:#55585c;font-size:12px;line-height:1.35;text-align:center}
.client-row img{width:100%;height:100%;aspect-ratio:4/3;object-fit:cover;transition:transform .45s cubic-bezier(.22,.8,.24,1),filter .45s ease}.client-row img:hover{transform:translateY(-5px);filter:contrast(1.04)}
.clients h3{margin:24px 8px 8px;color:#777a7d;font-size:14px;font-weight:500}.partners-image{width:100%;max-height:62vh;object-fit:contain}
.factory-slider{width:min(1180px,100%);margin:0 auto;aspect-ratio:16/8.5}.factory-slider figure{will-change:transform,opacity,clip-path}.factory-slider figure.active{z-index:1;opacity:1;visibility:visible;clip-path:none}
.history-event>span{display:block;margin-top:10px;color:#24262a;font-size:18px;line-height:1.42}
@media (min-width: 901px) {
  .history{position:relative;height:100svh;min-height:660px;overflow:hidden;color:#444649;background:#f3f2ee;font-family:Inter,"Noto Sans SC","Microsoft YaHei",Arial,sans-serif;isolation:isolate}
  .history::before{content:"";position:absolute;inset:0;border:12px solid rgb(255 255 255/24%);box-shadow:inset 0 0 110px rgb(119 113 103/8%);pointer-events:none}
  .history-copy{position:absolute;z-index:4;top:24%;right:6.2%;left:auto;width:45%;padding:18px 0 20px;background:transparent;will-change:transform}
  .history-copy .history-en{position:relative;z-index:1;display:grid;row-gap:clamp(10px,.75vw,14px);margin:0;font-size:72px;line-height:1.08;font-weight:600;letter-spacing:0}
  .history-en .history-title-line{position:relative;display:block;width:max-content;max-width:100%;margin:0;color:transparent;background:linear-gradient(90deg,#25272a 0 var(--reveal-progress,0%),rgb(61 63 66/20%) var(--reveal-progress,0%) 100%);background-clip:text;font-size:inherit;white-space:nowrap;will-change:background-image}
  .history-cn{position:relative;z-index:1;display:block!important;margin:24px 0 0!important;color:#77797c!important;font-size:22px!important;line-height:1.65!important;letter-spacing:0}
  .history-viewport{position:absolute;z-index:2;top:100px;right:0;bottom:50px;left:0;overflow:hidden}
  .history-track{position:relative;display:block;width:3000px;height:100%;padding:0;will-change:transform}
  .history-track .history-event{position:absolute;width:280px;height:auto;color:#222428;text-align:left}
  .history-event:nth-of-type(1){top:10%;left:220px}.history-event:nth-of-type(2){top:57%;left:700px}.history-event:nth-of-type(3){top:18%;left:1180px}.history-event:nth-of-type(4){top:62%;left:1660px}.history-event:nth-of-type(5){top:12%;left:2140px}.history-event:nth-of-type(6){top:55%;left:2620px}
  .history-event b,.history-event span{position:static;display:block}.history-event b{width:max-content;margin:0;color:transparent;background:linear-gradient(90deg,#e51b23,#f29aa0);background-clip:text;font-family:Bahnschrift,"Arial Black",Arial,sans-serif;font-size:90px;line-height:1;font-weight:700;letter-spacing:0}.history-event span{max-width:270px;margin-top:10px;color:#24262a;font-size:22px;line-height:1.42;letter-spacing:0}
  .history>.history-wheel-cursor{--history-wheel-size:clamp(64px,4.8vw,82px);position:absolute;z-index:4;top:calc(50% + 20px - var(--history-wheel-size) / 2);right:auto;bottom:auto;left:18%;display:block;width:var(--history-wheel-size);height:var(--history-wheel-size);background:transparent;box-shadow:none;pointer-events:none;will-change:transform}
  .history>.history-wheel-cursor::before{content:"";position:absolute;z-index:0;top:0;right:50%;width:var(--wire-length,0px);height:3px;background:repeating-linear-gradient(90deg,#aaa7a7 0 14px,transparent 14px 24px);transform:translateY(-50%);pointer-events:none}
  .history>.history-wheel-cursor::after{display:none}
  .history-wheel-cursor img{position:relative;z-index:1;display:block;width:100%;height:100%;object-fit:contain;will-change:transform}
  .history-orbit{position:absolute;z-index:5;bottom:-1px;left:50%;width:clamp(640px,50vw,920px);height:clamp(150px,12vw,210px);overflow:visible;transform:translateX(-50%);pointer-events:none}
  .history-orbit-ring{position:absolute;top:0;left:0;display:block;width:100%;aspect-ratio:1;border:3px dotted #ef2630;border-radius:50%;transform-origin:50% 50%;will-change:transform}
  .history-cursor{position:absolute!important;z-index:6!important;top:-6px!important;bottom:auto!important;left:calc(50% - 35px)!important;width:44px!important;height:13px!important;background:#e51b23!important;box-shadow:none;will-change:transform}
  .history-cursor::after{content:""!important;position:absolute!important;top:-11px!important;right:-25px!important;width:0!important;height:0!important;border:0!important;border-top:18px solid transparent!important;border-bottom:18px solid transparent!important;border-left:26px solid #e51b23!important;transform:none!important}
  .about-story { position: relative; isolation: isolate; height:200svh; min-height:1400px; overflow: hidden; background: #efefed; }
  .about-story-backdrop { position: absolute; z-index: 0; inset: 0; background: url('/assets/about-psd/banner.jpg') center top / cover no-repeat; transform-origin: 36% 34%; will-change: transform; }
  .about-story > section { position: relative; z-index: 1; width:100%; height:100svh; min-height:700px; overflow:hidden; background: transparent; }
  .about-story .about-hero { min-height: 700px; }
  .about-story .hero-media, .about-story .hero-machine { display: none; }
  .about-story .hero-copy { position:absolute;top:28%;left:54.5%;max-width:none;margin:0;padding:0;color:#2f3134;will-change:transform,opacity; }
  .about-story .hero-copy p { flex-direction: row; align-items: baseline; gap: 18px; margin-bottom: 8px; }
  .about-story .hero-copy strong { font-size: clamp(84px, 7vw, 120px); }
  .about-story .hero-copy span { margin: 0; color: #2f3134; font-size: clamp(20px, 2vw, 34px); }
  .about-story .hero-copy h1 { margin-left: clamp(66px, 7vw, 118px); font-size: clamp(31px, 3vw, 48px); line-height: 1.28; }
  .about-story .legacy { min-height:700px;padding:0;background:#f7f5ef url('/assets/about-psd/legacy.jpg') center / cover no-repeat; }
  .about-story .legacy>p{position:absolute;top:15%;left:8%;width:760px;font-size:58px;line-height:.98;font-weight:700}
  .about-story .legacy>div{position:absolute;right:7%;bottom:4%;display:flex;align-items:flex-start;color:transparent;background:linear-gradient(180deg,#ec111c 0%,#ef1f29 52%,rgb(239 31 41/12%) 100%);background-clip:text;line-height:.9}
  .about-story .legacy>div span{font-size:clamp(150px,16vw,244px);font-weight:500}.about-story .legacy>div strong{margin-left:36px;font-size:clamp(145px,15vw,232px);font-weight:500}
  .about-overview,.about-chapter{width:100%;height:100svh;min-height:700px;display:flex;align-items:center;overflow:hidden}
  .about-overview{padding:clamp(78px,9vh,105px) 0 clamp(36px,5vh,58px)}
  .about-chapter{padding:clamp(84px,11vh,112px) 0 clamp(35px,6vh,58px)}
  .about-chapter .section-inner{width:100%;max-height:calc(100svh - 140px)}
  .about-footer{height:100svh;min-height:700px;display:flex;padding:clamp(94px,13vh,126px) 0 55px;align-items:center;overflow:hidden}
  .clients{padding-top:clamp(76px,9vh,96px);padding-bottom:clamp(22px,4vh,38px)}
  .clients .section-inner h2{margin-bottom:18px}.clients h3{margin:clamp(12px,2vh,20px) 8px 10px}.clients .client-row{padding-top:0;padding-bottom:4px}.clients .client-row img{max-height:24vh}
}
@media (min-width:901px) and (max-width:1600px){.history-copy .history-en{font-size:52px}.history-event b{font-size:72px}.history-event span{font-size:18px}}
@media (min-width: 901px) and (max-width: 1100px) {
  .about-story .hero-copy { padding-left: 50%; padding-right: 2%; }
  .about-story .hero-copy h1 { margin-left: 0; }
}
@media(max-width:900px){.history-title-line{width:auto;margin-top:0!important;color:#333538;background:none;font-size:inherit!important;white-space:normal}.history-wheel-cursor,.history-orbit{display:none}.about-chapter{padding:62px 0}.certificate-row,.honor-row,.patent-row,.client-row{display:flex;gap:18px;overflow-x:auto;padding:8px 4px 25px}.certificate-row img,.patent-row img{flex:0 0 154px}.honor-row img,.client-row img{flex:0 0 226px}.factory-slider{aspect-ratio:4/3}.about-chapter .section-inner h2{font-size:38px}.about-chapter .section-inner h2::after{width:54px;margin-left:14px}}
@media(max-width:900px){.about-hero{min-height:800px;aspect-ratio:auto}.hero-media{inset:-2.5%}.hero-media img{object-position:right center}.hero-machine{z-index:1;right:auto;bottom:7%;left:3%;display:block;width:94%;max-height:none;opacity:1}.hero-copy{position:absolute;z-index:2;top:13%;right:24px;left:28px;max-width:none;margin:0;padding:0}.hero-copy p{flex-direction:row;align-items:baseline;gap:8px}.hero-copy strong{font-size:58px}.hero-copy span{margin:0;color:rgb(255 255 255/78%);font-size:16px;line-height:1.35}.hero-copy h1{margin:8px 0 0 66px;font-size:24px;line-height:1.35}.legacy{position:relative;min-height:720px;padding:0;display:block;background-color:#f7f5ef;background-image:linear-gradient(180deg,rgb(255 255 255/94%) 0%,rgb(255 255 255/72%) 22%,rgb(255 255 255/8%) 52%,rgb(247 245 239/0%) 70%,rgb(247 245 239/62%) 90%,#f7f5ef 100%),url('/assets/about-psd/legacy.jpg');background-position:center,43% center;background-size:cover}.legacy>p{position:absolute;top:13%;left:24px;width:calc(100% - 48px);font-size:34px;line-height:1.02;font-weight:700}.legacy>div{position:absolute;right:18px;bottom:8%;display:flex;align-items:flex-start;color:transparent;background:linear-gradient(180deg,#ec111c 0%,#ef1f29 52%,rgb(239 31 41/12%) 100%);background-clip:text;line-height:.9}.legacy>div span{font-size:104px}.legacy>div strong{margin-left:15px;font-size:100px}}
@media(prefers-reduced-motion:reduce){.history-title-line{color:#333538;background:none}.about-chapter .section-inner>*{opacity:1!important;transform:none!important}}

/* PSD typography baseline. The existing sections and GSAP state machine stay intact. */
.about-page{font-family:var(--ruijun-font-cn)}
.about-story .hero-copy strong,.about-story .hero-copy span,.about-story .hero-copy h1{font-family:var(--ruijun-font-cn);font-weight:400}
.about-story .hero-copy h1{font-size:clamp(34px,2.45vw,47px);line-height:1.3}
.about-story .legacy>p{font-family:var(--ruijun-font-latin);font-weight:300;line-height:1.05}
.about-story .legacy>div{font-family:var(--ruijun-font-latin);font-weight:300}
.about-story .legacy>div span,.about-story .legacy>div strong{font-weight:300}
.overview-inner{max-width:1570px}
.overview-top{width:77%;margin-left:auto;grid-template-columns:.85fr 1.15fr;gap:clamp(54px,4.2vw,82px)}
.overview-top>p{color:#c7c8c6;font-size:clamp(36px,3.04vw,58px);line-height:1.15;font-weight:300;white-space:nowrap}
.overview-top>p strong{display:inline;margin:0;font:inherit}
.overview-top div p{font-size:clamp(18px,1.52vw,29px);line-height:1.48}
.overview-top li{font-size:clamp(15px,1.02vw,19px);line-height:1.55}
.intro p{font-size:clamp(16px,1.15vw,22px);line-height:1.78}
.history-copy .history-en{font-family:var(--ruijun-font-latin);font-size:clamp(48px,3.04vw,58px);font-weight:300}
.history-event b{font-family:var(--ruijun-font-latin);font-size:clamp(48px,3.04vw,58px);font-weight:300}
.history-event span{font-size:clamp(17px,1.15vw,22px);font-weight:400}
.about-chapter .section-inner h2{margin-bottom:30px;font-size:clamp(22px,1.27vw,24px);line-height:1.35;font-weight:500}
.about-chapter .section-inner h2::after{display:none}
.about-chapter .section-inner h2 span{display:inline;margin-left:10px;font-size:clamp(15px,.94vw,18px)}
.clients h3{font-size:clamp(15px,.94vw,18px);font-weight:400}
.about-footer{font-family:var(--ruijun-font-cn)}
.about-footer h2{font-size:clamp(18px,1.27vw,24px);font-weight:500}
.about-footer a{font-size:clamp(13px,.9vw,17px)}
.about-footer address{font-size:clamp(12px,.78vw,15px)}
@media(max-width:900px){.overview-top{width:100%;margin-left:0;grid-template-columns:1fr}.overview-top>p{font-size:36px;white-space:normal}.overview-top div p{font-size:18px}.about-chapter .section-inner h2{font-size:24px}.history-copy .history-en{font-size:34px}.history-event b{font-size:42px}}

/* Exact PSD font assignment for the opening brand copy. */
.about-page .legacy-copy { font-family: var(--ruijun-font-cn); }

/* About-page text and desktop geometry measured from the supplied PSD. Timeline rules remain untouched. */
.about-story,.about-overview{background:#fbfaf7}
@media(min-width:901px){
  .about-story .hero-copy{top:29.8%;left:55.5%}
  .about-story .hero-copy p{gap:clamp(14px,1.15vw,44px);margin-bottom:clamp(14px,1.05vw,40px)}
  .about-story .hero-copy strong{font-size:clamp(60px,4.35vw,167px);line-height:.86}
  .about-story .hero-copy span{font-size:clamp(22px,1.82vw,70px);line-height:1.15}
  .about-story .hero-copy h1{margin-left:0;font-size:clamp(26px,1.78vw,68px);line-height:1.38}
  .overview-top>p{font-size:clamp(38px,2.7vw,104px);line-height:1.12}
  .overview-top div p{font-size:clamp(19px,1.58vw,60px);line-height:1.46}
  .overview-top ul{margin-top:clamp(30px,2.4vw,92px);margin-left:clamp(48px,3.5vw,70px)}
  .overview-top li{padding:0;border:0;font-size:clamp(16px,1.42vw,54px);line-height:1.58}
  .intro{margin-top:clamp(74px,6.25vw,240px);gap:clamp(64px,6vw,230px)}
  .intro p{margin:0;color:#b4b5b3;font-size:clamp(16px,1.05vw,40px);line-height:1.58}
  .about-chapter .section-inner h2,.clients h3{color:#777a7d;font-size:clamp(16px,1.15vw,44px);font-weight:400;line-height:1.3}
  .factory .section-inner h2{margin-bottom:clamp(26px,2.4vw,92px)}
  .clients .section-inner{padding-top:clamp(24px,2vw,78px)}
  .clients h3{margin:0 8px clamp(14px,1.4vw,54px)}
  .clients .client-row + h3{margin-top:clamp(34px,3vw,116px)}
  .about-footer-brand p{display:none}
  .about-story .legacy{isolation:isolate;contain:paint;clip-path:inset(0)}
  .about-story .legacy>div{right:8%;bottom:max(8%,10svh);line-height:.92}
  .about-story .legacy>div span{font-size:max(92px,min(14.5vw,18svh));letter-spacing:.012em}
  .about-story .legacy>div strong{margin-left:20px;font-size:max(72px,min(13.5vw,12svh));letter-spacing:.035em}
  .about-overview{position:relative;z-index:2;isolation:isolate}
}

/* Keep the legacy opening numerals on the PSD Chinese face; the PSD uses this face for Since/1997. */
.about-page .about-story .legacy>div,
.about-page .about-story .legacy>div span,
.about-page .about-story .legacy>div strong { font-family: var(--ruijun-font-cn); }

/* PSD measured ratios: 3840px artboard coordinates scaled to the desktop viewport. */
@media (min-width: 901px) {
  .about-story .hero-copy strong { font-size: clamp(52px, 3.8vw, 146px); }
  .about-story .hero-copy span { font-size: clamp(18px, 2.03vw, 60px); }
  .about-story .hero-copy h1 { font-size: clamp(23px, 1.78vw, 68px); }

  .overview-top>p { font-size: clamp(32px, 3.04vw, 116px); }
  .overview-top div p { font-size: clamp(16px, 1.52vw, 58px); }
  .overview-top>div { max-width: 31.5vw; }
  .overview-top ul { width: 19.4vw; max-width: 100%; }
  .overview-top li { font-size: clamp(13px, 1.02vw, 39px); line-height: 1.55; }

  .intro { grid-template-columns: minmax(0, 39vw) minmax(0, 1fr); }
  .intro p { font-size: clamp(14px, 1.15vw, 44px); line-height: 1.58; }
  .about-chapter .section-inner h2 { font-size: clamp(14px, 1.27vw, 48px); }
}

/* Continuous editorial flow borrowed from the reference site. The timeline remains a locked panel. */
@media (min-width: 901px) {
  .about-story { background: #fbfaf7; }
  .about-story::after {
    content: "";
    position: absolute;
    z-index: 2;
    right: 0;
    bottom: 0;
    left: 0;
    height: 18vh;
    pointer-events: none;
    background: linear-gradient(180deg, transparent, rgb(251 250 247 / 82%));
  }
  .about-overview {
    height: auto;
    min-height: 92svh;
    padding-top: clamp(110px, 13vh, 170px);
    padding-bottom: clamp(90px, 11vh, 150px);
  }
  .about-overview .overview-inner { max-height: none; }
  .about-chapter {
    position: relative;
    height: auto;
    min-height: 86svh;
    padding-top: clamp(96px, 12vh, 150px);
    padding-bottom: clamp(78px, 10vh, 130px);
  }
  .about-chapter::before {
    content: "";
    position: absolute;
    top: 0;
    left: max(32px, calc((100vw - 1570px) / 2));
    width: clamp(90px, 9vw, 170px);
    height: 2px;
    transform: scaleX(var(--chapter-progress, 0));
    transform-origin: left center;
    background: #e51b23;
  }
  .about-chapter .section-inner { max-height: none; }
  .about-chapter .document-row,
  .about-chapter .photo-row { position: relative; overflow: visible; }
  .about-chapter .document-row::after,
  .about-chapter .photo-row::after {
    content: "";
    position: absolute;
    top: 0;
    right: -1px;
    bottom: 24px;
    width: 8vw;
    pointer-events: none;
    background: linear-gradient(90deg, transparent, rgb(251 250 247 / 92%));
  }
  .credentials:not(.light) .document-row::after,
  .clients .photo-row::after { background: linear-gradient(90deg, transparent, rgb(247 246 242 / 94%)); }
  .factory-slider,
  .partners-image { will-change: transform; }
}

@media (max-width: 900px) {
  .about-overview { padding-top: 88px; padding-bottom: 82px; }
  .about-chapter { min-height: 0; }
  .factory-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .factory-grid figure { min-width: 0; margin: 0; overflow: hidden; aspect-ratio: 792 / 446; }
  .factory-grid img { display: block; width: 100%; height: 100%; object-fit: cover; }
}

/* Desktop geometry mapped from the 3840px PSD artboard. */
@media (min-width: 901px) {
  .about-story-backdrop {
    inset: 0;
    height: auto;
    background-size: 100% 100%;
  }
  .about-story {
    height: 84.4792vw;
    min-height: 0;
  }
  .about-story > section {
    height: 42.2396vw;
    min-height: 0;
    background: transparent;
  }
  .about-story .hero-copy {
    top: 25.1823vw;
    left: 55.5469vw;
  }
  .about-story .hero-copy p { gap: 1.1979vw; margin-bottom: 1.5104vw; }
  .about-story .hero-copy strong { font-size: 3.8021vw; }
  .about-story .hero-copy span { font-size: 2.0313vw; }
  .about-story .hero-copy h1 { font-size: 1.7708vw; line-height: 1.38; }
  .about-story .legacy-copy {
    position: absolute;
    z-index: 3;
    top: 21.4844vw;
    left: 8%;
    right: auto;
    bottom: auto;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    color: #ed1b24;
    line-height: .92;
  }
  .about-story .legacy-copy span { font-size: 12.6563vw; letter-spacing: .012em; position: relative; z-index: 1; }
  .about-story .legacy-copy strong { margin: 2.6563vw 0 0 1.0938vw; font-size: 6.0938vw; letter-spacing: .035em; position: relative; z-index: 1; }

  .about-overview {
    /* PSD: y=3243..5157 on the 3840px artboard (1914px). */
    height: 49.8438vw;
    min-height: 0;
    display: block;
    padding: 0;
  }
  .about-overview .overview-inner {
    position: relative;
    width: 100%;
    max-width: none;
    height: 100%;
    padding: 0;
  }
  .about-overview .overview-top {
    position: static;
    display: block;
    width: 100%;
    height: 100%;
    margin: 0;
  }
  .about-overview .overview-top > p {
    position: absolute;
    top: 8.0729vw;
    left: 28.6719vw;
    margin: 0;
    font-size: 3.0417vw;
    line-height: 1.12;
  }
  .about-overview .overview-top > div {
    position: absolute;
    top: 7.2917vw;
    left: 57.0573vw;
    width: 31.4583vw;
    max-width: none;
  }
  .about-overview .overview-top div p { font-size: 1.5208vw; line-height: 1.46; }
  .about-overview .overview-top ul { width: 19.4271vw; margin-top: 2.3958vw; margin-left: 3.6458vw; }
  .about-overview .overview-top li { font-size: 1.0208vw; line-height: 1.55; }
  .about-overview .intro {
    position: absolute;
    top: 24.5573vw;
    left: 10.8073vw;
    width: 77.6823vw;
    display: grid;
    grid-template-columns: 38.9323vw 34.7135vw;
    gap: 4.0885vw;
    margin: 0;
    align-items: start;
  }
  .about-overview .intro p { font-size: 1.1458vw; line-height: 1.78; }
  .about-overview .intro img { width: 100%; max-height: none; }

  /* PSD: y=5154..7072 on the 3840px artboard (1918px). */
  .about-history.history { height: 49.9479vw; min-height: 0; }
  .about-chapter {
    height: 50.2083vw;
    min-height: 700px;
    padding: 0;
    display: block;
  }
  .about-chapter .section-inner {
    position: relative;
    width: 100%;
    max-width: none;
    height: 100%;
    padding: 8.9323vw 10.8073vw 0;
  }
  .about-chapter .section-inner h2 { margin-bottom: 2.2vw; font-size: 1.2708vw; }
  .factory-slider { width: 77.6823vw; aspect-ratio: 16 / 8.98; margin: 0; }
  .factory-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .8594vw; width: 85.1302vw; }
  .factory-grid figure { min-width: 0; margin: 0; overflow: hidden; aspect-ratio: 792 / 446; background: #e7e7e3; }
  .factory-grid img { display: block; width: 100%; height: 100%; object-fit: cover; will-change: transform; }
  .credentials .section-inner { padding-top: 5.5vw; }
  .partners .section-inner { padding-top: 5.5vw; }
  .partners-image { mix-blend-mode: multiply; filter: contrast(1.02) saturate(1.04); }
  .clients .section-inner { padding-top: 5.5vw; }
  .about-footer { height: 48.6719vw; min-height: 650px; }
}

/* PSD certificate spacing and document viewer. */
.factory-grid figure {
  cursor: zoom-in;
  transition: transform .42s cubic-bezier(.22,.8,.24,1), box-shadow .42s ease;
}
.factory-grid figure:hover,
.factory-grid figure:focus-visible {
  transform: translateY(-8px) scale(1.015);
  box-shadow: 0 18px 34px rgb(28 31 35 / 18%);
  outline: none;
}
.certificate-row,
.honor-row,
.patent-row { gap: clamp(8px, .72vw, 14px); }
.gallery-thumb {
  display: block;
  min-width: 0;
  width: 100%;
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  cursor: zoom-in;
}
.gallery-thumb:focus-visible { outline: 2px solid #e51b23; outline-offset: 4px; }
.gallery-thumb img { cursor: zoom-in; }
.honor-row .gallery-thumb img { border: 0; background: transparent; box-shadow: none; }
.honor-row .gallery-thumb:hover img { box-shadow: none; }
.partners-image {
  display: block;
  width: 100%;
  background: transparent;
  /* The supplied logo sheet is a JPG; multiply removes its baked-in white field. */
  mix-blend-mode: multiply;
  filter: contrast(1.02) saturate(1.04);
}

@media (min-width: 901px) {
  /* Keep the post-timeline chapters close to the PSD rhythm instead of leaving a full viewport of empty space. */
  .factory.about-chapter,
  .credentials.about-chapter,
  .partners.about-chapter { height: 34vw; min-height: 560px; }
  .clients.about-chapter { height: 40vw; min-height: 650px; }
}

@media (min-width: 901px) {
  /* Override the compact chapter height for the full supplier logo sheet. */
  .partners.about-chapter {
    height: auto;
    min-height: 0;
    overflow: visible;
  }
  .partners.about-chapter .section-inner {
    height: auto;
    padding-bottom: clamp(48px, 4vw, 90px);
  }
}
.gallery-is-open { overflow: hidden; }
.document-lightbox {
  position: fixed;
  z-index: 400;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 72px clamp(68px, 10vw, 180px);
  background: rgb(12 13 14 / 88%);
  backdrop-filter: blur(12px);
}
.document-lightbox-figure { display: grid; place-items: center; max-width: min(76vw, 1180px); max-height: calc(100vh - 120px); margin: 0; }
.document-lightbox-figure img { display: block; max-width: 100%; max-height: calc(100vh - 160px); object-fit: contain; box-shadow: 0 28px 80px rgb(0 0 0 / 45%); }
.document-lightbox-figure figcaption { margin-top: 14px; color: rgb(255 255 255 / 72%); font-size: 13px; }
.document-lightbox-close,
.document-lightbox-arrow { position: absolute; display: grid; place-items: center; border: 1px solid rgb(255 255 255 / 35%); color: #fff; background: rgb(0 0 0 / 24%); cursor: pointer; }
.document-lightbox-close { top: 24px; right: 28px; width: 42px; height: 42px; font-size: 28px; line-height: 1; }
.document-lightbox-arrow { top: 50%; width: 48px; height: 48px; margin-top: -24px; font-size: 22px; }
.document-lightbox-arrow.prev { left: 24px; }
.document-lightbox-arrow.next { right: 24px; }
.document-lightbox-close:hover,
.document-lightbox-arrow:hover { background: #e51b23; border-color: #e51b23; }
@media (max-width: 900px) {
  .document-lightbox { padding: 64px 42px; }
  .document-lightbox-arrow { width: 38px; height: 38px; margin-top: -19px; }
  .document-lightbox-arrow.prev { left: 8px; }
  .document-lightbox-arrow.next { right: 8px; }
  .document-lightbox-figure img { max-height: calc(100vh - 140px); }
}

/* Brand story copy belongs to the Since 1997 panel shown in the reference. */
.about-story .legacy > .legacy-story {
  position: absolute;
  z-index: 2;
  top: 31%;
  right: 8%;
  width: min(650px, 44vw);
  display: block;
  color: #343638;
  background: none;
  line-height: 1.75;
}
.about-story .legacy-story h2 {
  margin: 0 0 22px;
  color: #e51b23;
  font-size: clamp(28px, 2.2vw, 42px);
  line-height: 1.2;
  font-weight: 500;
  text-align: right;
}
.about-story .legacy-story p {
  margin: 0 0 18px;
  color: #4a4c4e;
  font-size: clamp(13px, .9vw, 17px);
  line-height: 1.65;
  font-weight: 400;
  text-indent: 2em;
  text-align: justify;
}
@media (min-width: 901px) {
  .about-story .legacy > .legacy-story {
    top: 22vw;
    right: 8%;
    left: auto;
    width: min(42vw, 1080px);
    z-index: 4;
  }
  .about-story .legacy-story h2 { text-align: right; }
}
.about-story .hero-copy strong { font-weight: 700 !important; }
.about-story .legacy-copy > span,
.about-story .legacy-copy > strong { font-weight: 500 !important; }
html[data-cms-preview-edit-mode="true"] .about-story .legacy-copy{z-index:5;pointer-events:none}
html[data-cms-preview-edit-mode="true"] .about-story .legacy-copy [data-cms-preview-editable="true"]{position:relative;z-index:5;pointer-events:auto;cursor:text}
html[data-cms-preview-edit-mode="true"] .about-story>section{pointer-events:none}
html[data-cms-preview-edit-mode="true"] .about-story>section [data-cms-preview-editable="true"]{pointer-events:auto}
html[data-cms-preview-edit-mode="true"] .about-history{z-index:20}
html[data-cms-preview-edit-mode="true"][data-cms-preview-target-key="history"] .about-overview{pointer-events:none}
html[data-cms-preview-edit-mode="true"] .about-history .history-viewport{z-index:6}
html[data-cms-preview-edit-mode="true"] .about-history .history-event{position:relative;z-index:6}
.about-overview .overview-top > p,
.about-overview .overview-top > p strong { color: #55595d; }
.about-overview .overview-top > div,
.about-overview .overview-top > div p,
.about-overview .overview-top li { color: #25282b; }
.about-overview .intro p { color: #3f4347; }
.about-overview .intro { align-items: start; }
.about-overview .intro p { margin-top: 0; text-indent: 2em; text-align: justify; }
@media (min-width: 901px) {
  /* Mirror the homepage timeline typography and hierarchy. */
  .about-history .history-copy .history-cn { display: none !important; }
  .about-history .history-copy .history-en {
    font-size: 3.04vw;
    line-height: 1.12;
    font-weight: 300;
    letter-spacing: .04em;
  }
  .about-history .history-event b {
    font-size: clamp(64px, 4.17vw, 82px);
    line-height: .94;
    font-weight: 700;
    letter-spacing: .06em;
  }
  .about-history .history-event span {
    font-size: 1.15vw;
    line-height: 1.3;
    font-weight: 400;
    letter-spacing: .08em;
  }
}
.about-page .about-history {
  background-color: #f3f2ee;
  background-image: url('/assets/timeline-paper-texture.jpg');
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
}
</style>
