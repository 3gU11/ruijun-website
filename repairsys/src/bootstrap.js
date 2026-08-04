import { createApp } from 'vue';
import { ElLoading } from 'element-plus/es/components/loading/index.mjs';
import 'element-plus/es/components/loading/style/css';
import './styles.css';

export function mountApp(component, plugins = []) {
  const app = createApp(component);
  app.directive('loading', ElLoading.directive);
  plugins.forEach((plugin) => app.use(plugin));
  app.mount('#app');
}
