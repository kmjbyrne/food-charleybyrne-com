// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'

export default withNuxt(
  {
    ignores: ['cdk/**']
  },
  {
    plugins: {
      'better-tailwindcss': betterTailwindcss
    },
    settings: {
      'better-tailwindcss': {
        entryPoint: 'app/assets/css/main.css'
      }
    },
    rules: {
      'better-tailwindcss/enforce-canonical-classes': 'warn',
      'better-tailwindcss/enforce-shorthand-classes': 'warn',
      'better-tailwindcss/no-duplicate-classes': 'error',
      'better-tailwindcss/no-unnecessary-whitespace': 'error',
      'better-tailwindcss/no-unknown-classes': 'off',

      // Vue 3 supports fragments; this rule is Vue 2 semantics.
      'vue/no-multiple-template-root': 'off'
    }
  }
)
