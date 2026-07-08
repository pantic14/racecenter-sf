import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const RACECENTER = 'https://racecenter.letour.fr';

export default defineConfig({
  // relative asset paths so dist/index.html works as a chrome-extension:// page
  base: '',
  plugins: [svelte()],
  server: {
    // dev-only proxy: lets `npm run dev` hit the real API/SSE without CORS
    proxy: {
      '/api': { target: RACECENTER, changeOrigin: true },
      '/live-stream': { target: RACECENTER, changeOrigin: true },
      '/profils': { target: RACECENTER, changeOrigin: true },
    },
  },
});
