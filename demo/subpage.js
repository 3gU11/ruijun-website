const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');
const siteHeader = document.querySelector('.site-header');
const firstPage = document.querySelector('main > section');
const desktopViewport = window.matchMedia('(min-width: 901px)');

menuToggle?.addEventListener('click', () => {
  const open = siteNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
});

siteNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  siteNav.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded', 'false');
}));

function syncSubpageHeader() {
  if (!siteHeader || !firstPage) return;
  if (document.body.classList.contains('about-page') && desktopViewport.matches) return;
  const firstPageEnd = firstPage.offsetTop + firstPage.offsetHeight;
  const hasLeftFirstPage = window.scrollY >= firstPageEnd - siteHeader.offsetHeight;
  siteHeader.classList.toggle('is-wide', hasLeftFirstPage);
}

window.addEventListener('scroll', syncSubpageHeader, { passive: true });
window.addEventListener('resize', syncSubpageHeader);
desktopViewport.addEventListener('change', syncSubpageHeader);
syncSubpageHeader();
