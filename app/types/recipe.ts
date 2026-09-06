export interface RecipeNutrition {
  servings?: number
  calories?: number
  fat?: { saturated?: number, mono?: number, poly?: number, trans?: number }
  cholesterol?: number
  sodium?: number
  potassium?: number
  carbs?: { fiber?: number, sugars?: number }
  protein?: number
  vitamins?: Record<string, number>
}

export interface RecipeVariantGroup {
  name: string
  section: string
  match?: string
  options?: string[]
  scopeBy?: string
  titlePrefix?: boolean
  default?: string
}

export interface RecipeMeta {
  path: string
  stem: string
  title: string
  description?: string
  category?: string
  tags?: string[]
  image?: string
  variants?: RecipeVariantGroup[]
  cover?: string
  diet?: Record<string, boolean>
  keto?: boolean
  time?: number
  prep?: number
  cook?: number
  servings?: number
  difficulty?: string
  nutrition?: RecipeNutrition
}
