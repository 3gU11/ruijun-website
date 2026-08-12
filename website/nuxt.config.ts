import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  ssr: true,
  buildDir: process.env.NUXT_BUILD_DIR || '.nuxt',
  devtools: { enabled: false },
  modules: ['motion-v/nuxt'],
  css: ['~/assets/inspira.css'],
  vite: {
    plugins: [tailwindcss()]
  },
  runtimeConfig: {
    cmsPagesUrl: process.env.CMS_PAGES_URL || '',
    cmsRepairPageConfigsUrl: process.env.CMS_REPAIR_PAGE_CONFIGS_URL || '',
    cmsSiteSettingsUrl: process.env.CMS_SITE_SETTINGS_URL || '',
    cmsProductSeriesUrl: process.env.CMS_PRODUCT_SERIES_URL || '',
    cmsProductModelsUrl: process.env.CMS_PRODUCT_MODELS_URL || '',
    cmsProductParametersUrl: process.env.CMS_PRODUCT_PARAMETERS_URL || '',
    cmsProductReleasesUrl: process.env.CMS_PRODUCT_RELEASES_URL || '',
    cmsServiceEntriesUrl: process.env.CMS_SERVICE_ENTRIES_URL || '',
    cmsServiceEntryClicksUrl: process.env.CMS_SERVICE_ENTRY_CLICKS_URL || '',
    cmsServiceResourcesUrl: process.env.CMS_SERVICE_RESOURCES_URL || '',
    cmsServiceLocationsUrl: process.env.CMS_SERVICE_LOCATIONS_URL || '',
    cmsMilestonesUrl: process.env.CMS_MILESTONES_URL || '',
    cmsQualificationsUrl: process.env.CMS_QUALIFICATIONS_URL || '',
    cmsManufacturingEvidenceUrl: process.env.CMS_MANUFACTURING_EVIDENCE_URL || '',
    cmsMediaAssetsUrl: process.env.CMS_MEDIA_ASSETS_URL || '',
    cmsPublicAssetBaseUrl: process.env.CMS_PUBLIC_ASSET_BASE_URL || '',
    cmsArticlesUrl: process.env.CMS_ARTICLES_URL || '',
    cmsLeadsUrl: process.env.CMS_LEADS_URL || '',
    cmsLeadDedupeKeysUrl: process.env.CMS_LEAD_DEDUPE_KEYS_URL || '',
    cmsLeadNotificationJobsUrl: process.env.CMS_LEAD_NOTIFICATION_JOBS_URL || '',
    cmsLeadUploadSessionsUrl: process.env.CMS_LEAD_UPLOAD_SESSIONS_URL || '',
    cmsFilesUrl: process.env.CMS_FILES_URL || '',
    cmsPreviewTokensUrl: process.env.CMS_PREVIEW_TOKENS_URL || '',
    cmsBffToken: process.env.CMS_BFF_TOKEN || '',
    cmsWebhookSecret: process.env.CMS_WEBHOOK_SECRET || '',
    leadDedupeSecret: process.env.LEAD_DEDUPE_SECRET || '',
    leadAttachmentSigningSecret: process.env.LEAD_ATTACHMENT_SIGNING_SECRET || '',
    difyBaseUrl: process.env.DIFY_BASE_URL || 'http://172.21.8.85/v1',
    difyApiKey: process.env.DIFY_API_KEY || '',
    difyUserPrefix: process.env.DIFY_USER_PREFIX || 'ruijun-website',
    repairsysHealthUrl: process.env.REPAIRSYS_HEALTH_URL || 'http://127.0.0.1:3101/api/health',
    repairsysApiUrl: process.env.REPAIRSYS_API_URL || 'http://127.0.0.1:3101/api',
    repairsysPublicBaseUrl: process.env.REPAIRSYS_PUBLIC_BASE_URL || '',
    cmsPublicContentCacheTtlMs: Number(process.env.CMS_PUBLIC_CONTENT_CACHE_TTL_MS || 30_000),
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://127.0.0.1:4300',
      faqBffUrl: process.env.NUXT_PUBLIC_FAQ_BFF_URL || ''
      ,repairPortalUrl: process.env.NUXT_PUBLIC_REPAIR_PORTAL_URL || process.env.REPAIRSYS_PUBLIC_BASE_URL || ''
    }
  },
  routeRules: {
    '/api/public/**': { cors: false, headers: { 'Cache-Control': 'no-store' } },
    '/warranty': { redirect: { to: '/repair/warranty', statusCode: 301 } },
    '/requests': { redirect: { to: '/repair/requests', statusCode: 301 } },
    '/support': { redirect: { to: '/service', statusCode: 301 } },
    '/repair/progress': { redirect: { to: '/repair/requests', statusCode: 301 } }
  },
  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      titleTemplate: '%s | 瑞钧智科',
      meta: [{ name: 'description', content: '瑞钧智科中走丝线切割机床' }]
    }
  }
});
