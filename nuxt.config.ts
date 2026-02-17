import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const currentDir = dirname(fileURLToPath(import.meta.url))

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  
  future: {
    compatibilityVersion: 4,
  },

  modules: [
    '@vueuse/nuxt',
    '@nuxt/icon',
    'motion-v/nuxt',
  ],

  css: [
    // oat.css - import from node_modules
    '@knadh/oat/oat.min.css',
    // Custom overrides
    join(currentDir, './app/assets/css/overrides.css'),
  ],

  app: {
    head: {
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },

  imports: {
    dirs: [
      // Auto-import utils from the layer's app/utils directory
      './app/utils',
    ],
  },

  devtools: { enabled: true },
})
