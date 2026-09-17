import { defineConfig, loadEnv } from 'vite';
import identificationConfig from './config/generated/identification.json' with { type: 'json' };
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';
import { existsSync, readFileSync } from 'node:fs';
import { diagnosticsPlugin } from './scripts/diagnostics-plugin.ts';

export default defineConfig(({ mode }) => ({
  publicDir: mode === 'android' ? 'public-android' : mode === 'web' ? 'public-web' : 'public',
  define: {
    'import.meta.env.VITE_APP_BUILD': JSON.stringify(new Date().toISOString()),
    'import.meta.env.VITE_HOSTED_WEB': JSON.stringify(mode === 'web' ? 'true' : 'false'),
    // Private testing APK: direct native HTTP, no computer/proxy dependency.
    // Browser use requires an explicitly CORS-enabled key and opt-in.
    'import.meta.env.VITE_PLANTNET_API_KEY': JSON.stringify(
      mode === 'android'
        ? (loadEnv(mode, process.cwd(), '').PLANTNET_API_KEY ?? '')
        : loadEnv(mode, process.cwd(), '').PLANTNET_WEB_ENABLED === 'true'
          ? (loadEnv(mode, process.cwd(), '').PLANTNET_WEB_API_KEY ??
            loadEnv(mode, process.cwd(), '').PLANTNET_API_KEY ??
            '')
          : '',
    ),
    ...(mode === 'android'
      ? {
          'import.meta.env.VITE_COMPUTER_URL': JSON.stringify(
            process.env.VITE_COMPUTER_URL ??
              (existsSync('.certs/phone.json')
                ? `https://${JSON.parse(readFileSync('.certs/phone.json', 'utf8')).address}:5174`
                : ''),
          ),
        }
      : {}),
  },
  resolve: {
    alias:
      mode === 'android'
        ? [
            {
              find: 'virtual:pwa-register',
              replacement: new URL('./src/native/noServiceWorker.ts', import.meta.url).pathname,
            },
          ]
        : [],
    conditions: ['onnxruntime-web-use-extern-wasm', 'module', 'browser', 'development|production'],
  },
  plugins: [
    ...(mode === 'web' ? [] : [diagnosticsPlugin()]),
    react(),
    ...(mode === 'https' ? [basicSsl()] : []),
    ...(mode === 'android'
      ? []
      : [
          VitePWA({
            registerType: 'prompt',
            includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
            manifest: {
              name: 'Fieldbook',
              short_name: 'Fieldbook',
              description: 'A little closer to the living world.',
              theme_color: '#284f3d',
              background_color: '#f5f3e9',
              display: 'standalone',
              start_url: '/',
              icons: [
                { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
                {
                  src: '/icon-512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'any maskable',
                },
              ],
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
              maximumFileSizeToCacheInBytes: 4_000_000,
              cleanupOutdatedCaches: true,
              clientsClaim: true,
              navigateFallback: '/index.html',
              navigateFallbackDenylist: [/^\/__fieldbook_debug/, /^\/downloads\//],
              runtimeCaching: [
                {
                  urlPattern: /\/runtime\/ort-.*\.(wasm|mjs)$/,
                  handler: 'CacheFirst',
                  options: {
                    cacheName: `fieldbook-model-${identificationConfig.id}`,
                    cacheableResponse: { statuses: [200] },
                  },
                },
                {
                  urlPattern: /^https:\/\/tiles\.inaturalist\.org\/v1\/heatmap\//,
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'species-density',
                    expiration: { maxEntries: 200, maxAgeSeconds: 2592000 },
                    cacheableResponse: { statuses: [200] },
                  },
                },
                {
                  urlPattern:
                    /^https:\/\/(?:static\.inaturalist\.org|inaturalist-open-data\.s3\.amazonaws\.com)\/photos\//,
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'species-photos',
                    expiration: { maxEntries: 250, maxAgeSeconds: 60 * 60 * 24 * 90 },
                    // Display-only cross-origin photos can be opaque responses.
                    cacheableResponse: { statuses: [0, 200] },
                  },
                },
              ],
            },
          }),
        ]),
  ],
  build: {
    outDir: mode === 'android' ? 'dist-android' : mode === 'web' ? 'dist-web' : 'dist',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          const plantPart = id.match(/stories\/[^/]+\/[^/]+\.cli\/part-(\d+)\.json/);
          if (plantPart) return `plant-stories-${plantPart[1]}`;
          // Keep the aggregator out of catalogue so it cannot pull all parts into it.
          if (/\.cli\/index\.ts$/.test(id)) return undefined;
          return /country-catalogue\.json/.test(id)
            ? 'country-catalogue'
            : /node_modules\/(maplibre-gl|pmtiles|@mapbox|pbf)\//.test(id)
              ? 'map'
              : /config\/generated\/|stories\//.test(id)
                ? 'catalogue'
                : undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      deny: [
        '.env',
        '.env.*',
        '*.{crt,pem}',
        '**/.git/**',
        '**/.certs/**',
        '**/data/diagnostics/**',
      ],
    },
  },
  preview:
    mode === 'phone'
      ? {
          cors: { origin: 'https://localhost', exposedHeaders: ['Content-Range', 'ETag'] },
          port: 5174,
          strictPort: true,
          https: {
            key: readFileSync('.certs/server-key.pem'),
            cert: readFileSync('.certs/server.pem'),
          },
        }
      : undefined,
}));
