export default defineNuxtConfig({
  extends: ['..'],

  nitro: {
    preset: 'cloudflare-pages',
  },

  // @nuxt/image pulls in sharp (native binaries) which can't run on CF edge.
  // Disable it entirely and use plain <img> tags on edge — images are external
  // RSS CDN URLs that don't need server-side transformation.
  modules: [
    '@vueuse/nuxt',
    '@nuxt/icon',
    'motion-v/nuxt',
    // @nuxt/image intentionally excluded
  ],
})
