import ModuleComponent from './module.vue';
import { installNativeLivePreviewBridge } from './native-live-preview-bridge.js';

function installHomepageSectionsShortcut() {
  if (typeof window === 'undefined' || window.__ruijunHomepageSectionsShortcut) return;
  window.__ruijunHomepageSectionsShortcut = true;

  const sync = () => {
    const route = window.location.pathname;
    const existing = document.querySelector('[data-ruijun-workbench-shortcut]');
    if (route !== '/admin/content/homepage_sections') {
      existing?.remove();
      return;
    }
    if (existing || !document.body) return;
    const link = document.createElement('a');
    link.href = '/admin/ruijun-content-editor-workbench';
    link.textContent = '进入内容编辑工作台';
    link.setAttribute('data-ruijun-workbench-shortcut', 'true');
    link.setAttribute('aria-label', '进入内容编辑工作台');
    Object.assign(link.style, {
      position: 'fixed', top: '72px', right: '24px', zIndex: '100',
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      border: '1px solid #d66a0b', borderRadius: '4px',
      background: '#f08016', color: '#fff', padding: '9px 14px',
      font: '600 13px sans-serif', textDecoration: 'none',
      boxShadow: '0 2px 8px rgb(0 0 0 / 16%)'
    });
    document.body.append(link);
  };

  const observer = new MutationObserver(sync);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', sync);
  window.setInterval(sync, 1000);
  sync();
}

function installWorkbenchNavigationEntry() {
  if (typeof window === 'undefined' || window.__ruijunWorkbenchNavigationEntry) return;
  window.__ruijunWorkbenchNavigationEntry = true;

  const sync = () => {
    const route = window.location.pathname;
    const existing = document.querySelector('[data-ruijun-workbench-navigation-entry]');
    if (!route.startsWith('/admin/') || route === '/admin/login') {
      existing?.remove();
      return;
    }
    if (existing || !document.body) return;

    const link = document.createElement('a');
    link.href = '/admin/ruijun-content-editor-workbench';
    link.title = '内容编辑工作台';
    link.setAttribute('aria-label', '内容编辑工作台');
    link.setAttribute('data-ruijun-workbench-navigation-entry', 'true');
    link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 17.25V21h3.75L18.81 9.94l-3.75-3.75L4 17.25Zm17.71-10.04a1 1 0 0 0 0-1.42l-2.5-2.5a1 1 0 0 0-1.42 0l-1.17 1.17 3.75 3.75 1.34-1Z"/></svg>';
    Object.assign(link.style, {
      position: 'fixed', top: '428px', left: '0', zIndex: '110',
      display: 'grid', placeItems: 'center', width: '56px', height: '56px',
      boxSizing: 'border-box', borderLeft: '3px solid transparent',
      background: '#111820', color: '#9aa7b7', textDecoration: 'none',
      font: '20px/1 "Material Icons", "Material Symbols Rounded", sans-serif',
      transition: 'background .15s ease, color .15s ease, border-color .15s ease'
    });
    const icon = link.querySelector('svg');
    Object.assign(icon.style, { width: '24px', height: '24px', fill: 'currentColor' });
    link.addEventListener('mouseenter', () => {
      link.style.background = '#26313b';
      link.style.color = '#fff';
      link.style.borderLeftColor = '#f08016';
    });
    link.addEventListener('mouseleave', () => {
      link.style.background = '#111820';
      link.style.color = '#9aa7b7';
      link.style.borderLeftColor = 'transparent';
    });
    document.body.append(link);
  };

  const observer = new MutationObserver(sync);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', sync);
  window.setInterval(sync, 1000);
  sync();
}

if (typeof window !== 'undefined') {
  installNativeLivePreviewBridge();
  installHomepageSectionsShortcut();
  installWorkbenchNavigationEntry();
}

export default {
  id: 'ruijun-content-editor-workbench',
  name: '内容编辑工作台',
  icon: 'edit_note',
  preRegisterCheck: (user, permissions) => Boolean(
    user?.admin_access
    || user?.role?.name === 'Administrator'
    || user?.role?.name === '系统管理员'
    || permissions?.pages?.create?.access !== 'none'
  ),
  routes: [{ path: '', component: ModuleComponent }]
};
