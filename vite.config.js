import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import https from 'node:https';

const RACECENTER = 'https://racecenter.letour.fr';

// racecenter's /live-stream sends a chunked encoding that Node's HTTP parser
// rejects ("Invalid character in chunk size") — even with --insecure-http-parser,
// because Vite's built-in proxy never forwards that option to its outgoing request.
// Browsers and curl tolerate it; so we bypass http-proxy for the SSE and stream it
// ourselves with insecureHTTPParser set explicitly on the upstream request.
function liveStreamProxy() {
  return {
    name: 'live-stream-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/live-stream')) return next();
        const upstream = https.get(
          RACECENTER + req.url,
          { insecureHTTPParser: true, headers: { accept: 'text/event-stream' } },
          (up) => {
            res.writeHead(up.statusCode ?? 200, {
              'content-type': up.headers['content-type'] ?? 'text/event-stream',
              'cache-control': 'no-cache',
              connection: 'keep-alive',
            });
            up.pipe(res);
          },
        );
        upstream.on('error', (e) => {
          if (!res.headersSent) res.writeHead(502);
          res.end(`live-stream proxy error: ${e.message}`);
        });
        req.on('close', () => upstream.destroy());
      });
    },
  };
}

export default defineConfig({
  // relative asset paths so dist/index.html works as a chrome-extension:// page
  base: '',
  plugins: [svelte(), liveStreamProxy()],
  server: {
    // dev-only proxy for the plain REST/asset requests (these parse fine);
    // the long-lived SSE is handled by liveStreamProxy above.
    proxy: {
      '/api': { target: RACECENTER, changeOrigin: true },
      '/profils': { target: RACECENTER, changeOrigin: true },
    },
  },
});
