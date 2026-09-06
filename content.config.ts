import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    techniques: defineCollection({
      type: 'page',
      source: 'techniques/**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        time: z.number().optional(),
        difficulty: z.string().optional(),
        equipment: z.array(z.string()).optional()
      })
    }),

    recipes: defineCollection({
      type: 'page',
      source: 'recipes/**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        image: z.string().optional(),
        variants: z
          .array(
            z.object({
              name: z.string(),
              section: z.string(),
              match: z.string().optional(),
              options: z.array(z.string()).optional(),
              optionPaths: z.record(z.string()).optional(),
              scopeBy: z.string().optional(),
              titlePrefix: z.boolean().optional(),
              default: z.string().optional()
            })
          )
          .optional(),
        cover: z.string().optional(),
        keto: z.boolean().optional(),
        paths: z.array(z.string()).optional(),
        links: z.array(z.string()).optional(),
        index: z.boolean().optional(),
        slug: z.string().optional(),
        inherits: z.string().optional(),
        inheritsSection: z.string().optional(),
        inheritsVariant: z.string().optional(),
        inheritsWhen: z.record(z.string()).optional(),
        components: z
          .array(z.object({ recipe: z.string(), label: z.string().optional() }))
          .optional(),
        substitutes: z
          .array(z.object({ from: z.string(), to: z.string(), note: z.string().optional() }))
          .optional(),
        motherSauce: z.boolean().optional(),
        diet: z.record(z.boolean()).optional(),
        time: z.number().optional(),
        prep: z.number().optional(),
        cook: z.number().optional(),
        servings: z.number().optional(),
        difficulty: z.string().optional(),
        nutrition: z
          .object({
            servings: z.number().optional(),
            calories: z.number().optional(),
            fat: z
              .object({
                saturated: z.number().optional(),
                mono: z.number().optional(),
                poly: z.number().optional(),
                trans: z.number().optional()
              })
              .optional(),
            cholesterol: z.number().optional(),
            sodium: z.number().optional(),
            potassium: z.number().optional(),
            carbs: z
              .object({
                fiber: z.number().optional(),
                sugars: z.number().optional()
              })
              .optional(),
            protein: z.number().optional(),
            vitamins: z.record(z.number()).optional()
          })
          .optional()
      })
    })
  }
})
