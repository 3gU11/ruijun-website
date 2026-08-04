import { createRouter, createWebHistory } from 'vue-router';

const RouteAnchor = { render: () => null };

export const clientRoutes = {
  home: '/support',
  request: '/repair/new',
  orders: '/requests',
  warranty: '/warranty'
};

export const clientRouter = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: clientRoutes.home },
    { path: clientRoutes.home, name: 'client-support', component: RouteAnchor, meta: { clientView: 'home' } },
    { path: clientRoutes.request, name: 'client-repair', component: RouteAnchor, meta: { clientView: 'request' } },
    { path: clientRoutes.orders, name: 'client-requests', component: RouteAnchor, meta: { clientView: 'orders', requiresClient: true } },
    { path: clientRoutes.warranty, name: 'client-warranty', component: RouteAnchor, meta: { clientView: 'home', warrantyEntry: true } },
    { path: '/:pathMatch(.*)*', redirect: clientRoutes.home }
  ]
});
