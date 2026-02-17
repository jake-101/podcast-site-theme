export default defineNuxtConfig({
  extends: ['..'],
  nitro: {
    static: true,
    prerender: {
      failOnError: false,
    },
  },
})
