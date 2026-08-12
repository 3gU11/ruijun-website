import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const certPath = resolve(__dirname, '.certs', 'repair-lan.pem');
const keyPath = resolve(__dirname, '.certs', 'repair-lan-key.pem');
const localHttps = existsSync(certPath) && existsSync(keyPath)
  ? { cert: readFileSync(certPath), key: readFileSync(keyPath) }
  : undefined;

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
    https: localHttps,
    headers: {
      'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()'
    },
    proxy: {
      '/api': 'http://127.0.0.1:3101',
      '/uploads': 'http://127.0.0.1:3101'
    }
  },
  preview: {
    https: localHttps,
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
