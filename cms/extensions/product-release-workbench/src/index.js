import ModuleComponent from './module.vue';

export default {
  id: 'ruijun-product-release-workbench',
  name: '产品统一发布',
  icon: 'inventory_2',
  preRegisterCheck: (user) => Boolean(user?.admin_access),
  routes: [{ path: '', component: ModuleComponent }]
};
