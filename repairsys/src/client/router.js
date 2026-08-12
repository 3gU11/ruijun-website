import { createRouter, createWebHistory } from 'vue-router';

const RouteAnchor = { render: () => null };

export const clientRoutes = {
  home: '/support',
  request: '/repair',
  orders: '/requests',
  warranty: '/warranty',
  scan: '/scan/:token'
};

export const clientRouter = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: clientRoutes.home },
    { path: clientRoutes.home, name: 'client-support', component: RouteAnchor, meta: { clientView: 'home' } },
    { path: clientRoutes.request, name: 'client-repair', component: RouteAnchor, meta: { clientView: 'request' } },
    { path: '/repair/new', redirect: (to) => ({ path: clientRoutes.request, query: to.query, hash: to.hash }) },
    { path: clientRoutes.orders, name: 'client-requests', component: RouteAnchor, meta: { clientView: 'orders', requiresClient: true } },
    { path: clientRoutes.warranty, name: 'client-warranty', component: RouteAnchor, meta: { clientView: 'warranty', warrantyEntry: true } },
    { path: '/scan', name: 'client-board-scan-entry', component: RouteAnchor, meta: { clientView: 'scan' } },
    { path: clientRoutes.scan, name: 'client-board-scan', component: RouteAnchor, meta: { clientView: 'scan' } },
    { path: '/:pathMatch(.*)*', redirect: clientRoutes.home }
  ]
});
