import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const api = 'https://market.pumpkinmc.org'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: api,
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
        configure: proxy => proxy.on('proxyReq', req => req.setHeader('origin', api)),
      },
    },
  },
})
