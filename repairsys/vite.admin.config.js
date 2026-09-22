import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import { resolve } from 'node:path';

function adminHome() {
  return {
    name: 'admin-home',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/') {
          req.url = '/admin.html';
        }
        next();
      });
    }
  };
}

export default defineConfig({
  cacheDir: resolve(__dirname, 'node_modules/.vite-admin'),
  resolve: {
    dedupe: ['vue', 'vue-router', 'element-plus']
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', 'element-plus', '@element-plus/icons-vue']
  },
  plugins: [
    vue(),
    Components({ resolvers: [ElementPlusResolver({ importStyle: 'css' })] }),
    adminHome()
  ],
  define: { __AUTH_SCOPE__: JSON.stringify('admin') },
  server: {
    host: '0.0.0.0',
    port: 1888,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:3101',
      '/uploads': 'http://127.0.0.1:3101'
    }
  },
  build: {
    outDir: 'dist/admin',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        admin: resolve(__dirname, 'admin.html')
      }
    }
  }
});
