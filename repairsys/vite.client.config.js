import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import { resolve } from 'node:path';

function clientHome() {
  return {
    name: 'client-home',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = String(req.url || '').split('?')[0];
        if (['/', '/support', '/repair/new', '/requests', '/warranty'].includes(pathname)) {
          req.url = '/client.html';
        }
        next();
      });
    }
  };
}

export default defineConfig({
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
    proxy: {
      '/api': 'http://127.0.0.1:3101',
      '/uploads': 'http://127.0.0.1:3101'
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
