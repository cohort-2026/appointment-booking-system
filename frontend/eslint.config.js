import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  // Generated component APIs intentionally expose these named helpers.
  ...[
    ['button', 'buttonVariants'],
    ['badge', 'badgeVariants'],
    ['tabs', 'tabsListVariants'],
    ['sidebar', 'useSidebar'],
  ].map(([file, exportName]) => ({
    files: [`src/components/ui/${file}.tsx`],
    rules: {
      'react-refresh/only-export-components': ['error', {
        allowConstantExport: true,
        allowExportNames: [exportName],
      }],
    },
  })),
])
