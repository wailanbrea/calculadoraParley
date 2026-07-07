import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import http from 'http'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'php-proxy',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && (req.url.startsWith('/api.php') || req.url.includes('/api.php?'))) {
            const proxyReq = http.request({
              host: '127.0.0.1',
              port: 8099,
              path: req.url,
              method: req.method,
              headers: req.headers
            }, (proxyRes) => {
              res.writeHead(proxyRes.statusCode, proxyRes.headers);
              proxyRes.pipe(res);
            });
            proxyReq.on('error', (err) => {
              res.writeHead(502, { 'Content-Type': 'text/plain' });
              res.end(`Bad Gateway: ${err.message}`);
            });
            req.pipe(proxyReq);
            return;
          }
          next();
        });
      }
    }
  ],
  server: {
    proxy: {
      '/api.php': {
        target: 'http://127.0.0.1:8099',
        changeOrigin: true,
      },
    },
  },
})
