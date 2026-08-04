import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '127.0.0.1',
    port: 2888
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        client: resolve(__dirname, 'client.html'),
        admin: resolve(__dirname, 'admin.html')
      }
    }
  }
});
