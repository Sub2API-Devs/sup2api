import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import ts from 'typescript-eslint'
import vueI18n from '@intlify/eslint-plugin-vue-i18n'
import globals from 'globals'

export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue', '**/*.ts', '**/*.js'],
    languageOptions: {
      // typescript-eslint turns no-undef off for .ts only; .vue SFCs run in the browser.
      globals: { ...globals.browser },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        parser: ts.parser
      }
    },
    plugins: {
      '@intlify/vue-i18n': vueI18n
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
      '@intlify/vue-i18n/no-raw-text': 'off'
    }
  },
  {
    ignores: ['dist/', 'node_modules/', '*.config.js']
  }
]
