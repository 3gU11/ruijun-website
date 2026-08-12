import ModuleComponent from './module.vue';

export default {
  id: 'ruijun-knowledge-review-workbench',
  name: '常见问题知识审核',
  icon: 'fact_check',
  preRegisterCheck: (user) => Boolean(user?.admin_access),
  routes: [{ path: '', component: ModuleComponent }]
};
