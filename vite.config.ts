import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const target = loadEnv(mode, process.cwd(), '').API_PROXY_TARGET || 'https://market.pumpkinmc.org'
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          cookieDomainRewrite: 'localhost',
          configure: proxy => proxy.on('proxyReq', req => req.setHeader('origin', target)),
        },
      },
    },
  }
})
