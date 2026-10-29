import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command }) => ({
  // Base path differs per host:
  //  - GitHub Pages project site  -> /SimplePosSystem/ (subpath)
  //  - Vercel (root domain) + dev  -> /
  //  - Android APK (Capacitor)     -> ./  (APK=1; assets are bundled, no service worker)
  base: process.env.APK ? './' : command === 'build' && !process.env.VERCEL ? '/SimplePosSystem/' : '/',
  server: {
    port: parseInt(process.env.PORT || '5173'),
    strictPort: false,
  },
  plugins: [
    react(),
    VitePWA({
      // The APK ships its own copy of every asset, so a service worker would only
      // add a second, stale cache.
      disable: !!process.env.APK,
      registerType: 'autoUpdate',
      manifest: {
        name: 'TindaPOS',
        short_name: 'TindaPOS',
        description: 'POS para sa mga tindahan at palengke',
        theme_color: '#F59E0B',
        background_color: '#FAFAF7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,lottie,wasm}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'gstatic-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          }
        ]
      }
    })
  ]
}))
