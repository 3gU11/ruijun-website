import ModuleComponent from './module.vue';

export default {
  id: 'ruijun-content-publication-queue-workbench',
  name: '发布中心',
  icon: 'publish',
  preRegisterCheck: (user, permissions) => Boolean(user?.admin_access || permissions?.pages?.update?.access === 'full'),
  routes: [{ path: '', component: ModuleComponent }]
};
