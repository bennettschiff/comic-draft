import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// In `npm run dev`, serve the Vercel functions in /api from the Vite server,
// so local development needs no Vercel CLI. Production uses Vercel's runtime.
function apiDev() {
  return {
    name: 'api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next()
        const name = req.url.slice(5).split('?')[0]
        if (!/^[a-z-]+$/.test(name)) { res.statusCode = 404; return res.end() }
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.js`)
          const handler = mod[req.method]
          if (!handler) { res.statusCode = 405; return res.end() }
          const chunks = []
          for await (const c of req) chunks.push(c)
          const headers = new Headers()
          for (const k of ['cookie', 'content-type']) if (req.headers[k]) headers.set(k, req.headers[k])
          const request = new Request(`http://${req.headers.host}${req.url}`, {
            method: req.method,
            headers,
            body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
          })
          const response = await handler(request)
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (e) {
          console.error(e)
          res.statusCode = 500
          res.end(String(e))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    plugins: [
      react(),
      apiDev(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon-192.png', 'icon-512.png'],
        workbox: { navigateFallbackDenylist: [/^\/api\//] },
        manifest: {
          name: 'Comic Draft',
          short_name: 'Comic Draft',
          description: 'Comedy writing: ideas, outlines, scripts, sketches and stand-up',
          theme_color: '#15130d',
          background_color: '#15130d',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
      }),
    ],
  }
})
