import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    recipes: defineCollection({
      type: 'page',
      source: 'recipes/**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        image: z.string().optional(),
        cover: z.string().optional(),
        keto: z.boolean().optional(),
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
