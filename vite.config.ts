/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt' lets the app choose the moment to switch to a new version (see src/lib/appUpdate.ts).
      registerType: 'prompt',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      workbox: { importScripts: ['/push-sw.js'] }, // push reminders
      manifest: {
        name: 'The 90-Day Era',
        short_name: '90-Day Era',
        description: 'Your journey. Your rules. Your glow-up.',
        theme_color: '#a78bfa',
        background_color: '#fff8fb',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, "src") } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
