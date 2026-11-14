import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const api = 'https://market.pumpkinmc.org'

type SurfaceKind = 'market' | 'accounts' | 'servers'

interface SurfaceMeta {
  title: string
  ogTitle: string
  siteName: string
  description: string
  origin: string
  bodyClass: string
  includeOpenSearch: boolean
}

const SURFACE_META: Record<SurfaceKind, SurfaceMeta> = {
  market: {
    title: 'Pumpkin Market',
    ogTitle: 'Pumpkin Market',
    siteName: 'Pumpkin Market',
    description:
      'Discover, download, and publish high-performance WebAssembly plugins for PumpkinMC Minecraft servers.',
    origin: 'https://market.pumpkinmc.org',
    bodyClass: 'market',
    includeOpenSearch: true,
  },
  accounts: {
    title: 'Pumpkin Account',
    ogTitle: 'Pumpkin Account',
    siteName: 'Pumpkin Account',
    description:
      'Single sign-on, passkeys, 2FA security, and server management across PumpkinMC services.',
    origin: 'https://accounts.pumpkinmc.org',
    bodyClass: 'market account',
    includeOpenSearch: false,
  },
  servers: {
    title: 'Pumpkin Servers',
    ogTitle: 'Pumpkin Server List',
    siteName: 'Pumpkin Servers',
    description:
      'Explore community Minecraft servers powered by Pumpkin, with live player counts and zero fake slots.',
    origin: 'https://servers.pumpkinmc.org',
    bodyClass: 'market servers',
    includeOpenSearch: false,
  },
}

function rewriteIndexHtmlForSurface(html: string, surface: SurfaceKind): string {
  const meta = SURFACE_META[surface]
  const iconUrl = `${meta.origin}/icon.png`
  const canonicalUrl = `${meta.origin}/`

  let out = html
    .replace(
      /<meta name="description" content="[^"]*"\s*\/>/,
      `<meta name="description" content="${meta.description}" />`
    )
    .replace(
      /<meta property="og:site_name" content="[^"]*"\s*\/>/,
      `<meta property="og:site_name" content="${meta.siteName}" />`
    )
    .replace(
      /<meta property="og:title" content="[^"]*"\s*\/>/,
      `<meta property="og:title" content="${meta.ogTitle}" />`
    )
    .replace(
      /<meta property="og:description" content="[^"]*"\s*\/>/,
      `<meta property="og:description" content="${meta.description}" />`
    )
    .replace(
      /<meta property="og:url" content="[^"]*"\s*\/>/,
      `<meta property="og:url" content="${canonicalUrl}" />`
    )
    .replace(
      /<meta property="og:image" content="[^"]*"\s*\/>/,
      `<meta property="og:image" content="${iconUrl}" />`
    )
    .replace(
      /<meta name="twitter:title" content="[^"]*"\s*\/>/,
      `<meta name="twitter:title" content="${meta.ogTitle}" />`
    )
    .replace(
      /<meta name="twitter:description" content="[^"]*"\s*\/>/,
      `<meta name="twitter:description" content="${meta.description}" />`
    )
    .replace(
      /<meta name="twitter:image" content="[^"]*"\s*\/>/,
      `<meta name="twitter:image" content="${iconUrl}" />`
    )
    .replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`)
    .replace(/<body class="[^"]*">/, `<body class="${meta.bodyClass}">`)

  if (!meta.includeOpenSearch) {
    out = out.replace(/\s*<link rel="search"[^>]*\/>/, '')
  }

  return out
}

function resolveActiveSurface(): SurfaceKind {
  const raw = (process.env.VITE_APP_SURFACE || '').trim().toLowerCase()
  if (raw === 'accounts') return 'accounts'
  if (raw === 'servers') return 'servers'
  return 'market'
}

function surfaceHtmlPlugin(): Plugin {
  let outDir = 'dist'
  const activeSurface = resolveActiveSurface()

  return {
    name: 'pumpkin-surface-html',
    configResolved(config) {
      outDir = config.build.outDir
    },
    transformIndexHtml(html) {
      return rewriteIndexHtmlForSurface(html, activeSurface)
    },
    closeBundle() {
      const indexPath = path.resolve(outDir, 'index.html')
      if (!fs.existsSync(indexPath)) return
      const builtHtml = fs.readFileSync(indexPath, 'utf8')
      fs.writeFileSync(
        path.resolve(outDir, 'index.accounts.html'),
        rewriteIndexHtmlForSurface(builtHtml, 'accounts'),
        'utf8'
      )
      fs.writeFileSync(
        path.resolve(outDir, 'index.servers.html'),
        rewriteIndexHtmlForSurface(builtHtml, 'servers'),
        'utf8'
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), surfaceHtmlPlugin()],
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
