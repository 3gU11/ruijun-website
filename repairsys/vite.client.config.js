import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import { resolve } from 'node:path';

function clientHome() {
  function rewriteRoot(request, _response, next) {
    const path = String(request.url || '').split('?')[0];
    const clientRoute = path === '/'
      || path === '/support'
      || path === '/repair'
      || path === '/repair/new'
      || path === '/requests'
      || path === '/warranty'
      || path === '/scan'
      || path.startsWith('/scan/');
    if (clientRoute) request.url = '/client.html';
    next();
  }

  return {
    name: 'client-home',
    configureServer(server) {
      server.middlewares.use(rewriteRoot);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewriteRoot);
    }
  };
}

export default defineConfig({
  cacheDir: resolve(__dirname, 'node_modules/.vite-client'),
  resolve: {
    dedupe: ['vue', 'vue-router', 'element-plus']
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', 'element-plus', '@element-plus/icons-vue']
  },
  plugins: [
    vue(),
    Components({ resolvers: [ElementPlusResolver({ importStyle: 'css' })] }),
    clientHome()
  ],
  define: { __AUTH_SCOPE__: JSON.stringify('client') },
  server: {
    host: '0.0.0.0',
    port: 2888,
    strictPort: true,
    headers: {
      'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()'
    },
    proxy: {
      '/api': 'http://127.0.0.1:3101',
      '/uploads': 'http://127.0.0.1:3101'
    }
  },
  preview: {
    headers: {
      'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()'
    }
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        client: resolve(__dirname, 'client.html')
      }
    }
  }
});
