import ModuleComponent from './module.vue';

export default {
  id: 'ruijun-content-editor-workbench',
  name: '内容编辑工作台',
  icon: 'edit_note',
  preRegisterCheck: (user, permissions) => Boolean(user?.admin_access || permissions?.pages?.create?.access !== 'none'),
  routes: [{ path: '', component: ModuleComponent }]
};
