import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectManifest: {
        swSrc: 'src/sw.ts',
        swDest: 'dist/sw.js',
        globDirectory: 'dist',
      },
      manifest: {
        name: 'EBR — Evaluación Basada en Riesgo',
        short_name: 'EBR',
        description: 'Sistema de inspección BPM para DIGEMAPS',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1565C0',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' },
  },
});
