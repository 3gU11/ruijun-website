(function configureRuijunSite() {
  const hostname = window.location.hostname || '127.0.0.1';
  const localProtocol = window.location.protocol === 'https:' ? 'https:' : 'http:';

  window.RUIJUN_SITE_CONFIG = Object.freeze({
    repairsys: Object.freeze({
      baseUrl: `${localProtocol}//${hostname}:2888`,
      serviceEntriesEndpoint: '/api/public/v1/service-entries',
      faqAnswerEndpoint: '/api/public/v1/faq/answer',
      analyticsEndpoint: '/api/public/v1/events',
      source: 'official_site',
      supportPhone: '150 5016 6844',
      routes: Object.freeze({
        support: '/support',
        request: '/repair/new',
        requests: '/requests',
        warranty: '/warranty'
      })
    })
  });
})();
