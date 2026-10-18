import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier/flat'

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  prettier,
  globalIgnores(['.next/**', '.contentlayer/**', 'out/**', 'next-env.d.ts']),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'react/no-unescaped-entities': 'off',
    },
  },
])
