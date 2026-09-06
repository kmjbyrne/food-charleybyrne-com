export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxt/content'],

  devtools: {
    enabled: true
  },

  routeRules: {
    // Recipes and categories share one namespace now, so the old prefixes
    // redirect and indexed links keep working.
    '/recipes/**': { redirect: { to: '/**', statusCode: 301 } },
    '/c/**': { redirect: { to: '/**', statusCode: 301 } },
    '/desserts/new-york-style-cheesecake': {
      redirect: { to: '/desserts/new-york-style-keto-cheesecake', statusCode: 301 }
    }
  },

  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'shortcut icon', href: '/favicon.ico' }
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  content: {
    // Headings toggle their section open/closed, so no anchor links.
    renderer: {
      anchorLinks: false
    },
    build: {
      markdown: {
        highlight: {
          theme: 'github-dark'
        }
      }
    }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
