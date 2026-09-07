export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxt/content'],

  devtools: {
    enabled: true
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

  routeRules: {
    // Recipes and categories share one namespace now, so the old prefixes
    // redirect and indexed links keep working.
    '/recipes/**': { redirect: { to: '/**', statusCode: 301 } },
    '/c/**': { redirect: { to: '/**', statusCode: 301 } },
    '/desserts/new-york-style-cheesecake': {
      redirect: { to: '/desserts/new-york-style-keto-cheesecake', statusCode: 301 }
    }
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    prerender: {
      crawlLinks: true,
      failOnError: false
    }
  },

  hooks: {
    // Variant pages are reachable only through client-rendered links, so the
    // crawler never sees them. They are enumerated from the content instead.
    async 'nitro:config'(nitroConfig) {
      if (!nitroConfig.prerender) return

      const { readdir, readFile } = await import('node:fs/promises')
      const { join } = await import('node:path')

      const walk = async (dir: string): Promise<string[]> => {
        const entries = await readdir(dir, { withFileTypes: true })
        const files = await Promise.all(entries.map((entry) => {
          const full = join(dir, entry.name)
          return entry.isDirectory() ? walk(full) : Promise.resolve([full])
        }))
        return files.flat().filter(f => f.endsWith('.md'))
      }

      const slugify = (value: string) => value.toLowerCase().replace(/\s+/g, '-')
      const routes: string[] = []

      for (const file of await walk('content/recipes')) {
        const raw = await readFile(file, 'utf8')
        const front = /^---\n([\s\S]*?)\n---/.exec(raw)?.[1]
        if (!front?.includes('variants:')) continue

        const base = file
          .replace(/^content\/recipes/, '')
          .replace(/\.md$/, '')
          .replace(/\/index$/, '')

        const options = [...front.matchAll(/options:\s*\[([^\]]+)\]/g)]
        const defaults = [...front.matchAll(/default:\s*(.+)/g)].map(m => m[1]!.trim())

        options.forEach((match, i) => {
          const fallback = defaults[i]
          for (const option of match[1]!.split(',').map(o => o.trim())) {
            if (option === fallback) continue
            routes.push(`${base}/${slugify(option)}`)
          }
        })
      }

      nitroConfig.prerender.routes = [
        ...(nitroConfig.prerender.routes ?? []),
        ...routes
      ]
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
