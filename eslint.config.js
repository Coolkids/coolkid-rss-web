const vue = require('eslint-plugin-vue')
const tseslint = require('typescript-eslint')

module.exports = [
  { ignores: ['dist/**', '.quasar/**', 'node_modules/**', 'public/**', 'src/mock/**'] },
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.{js,ts,vue}'],
    languageOptions: {
      parserOptions: {
        parser: require.resolve('@typescript-eslint/parser'),
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      'vue/no-v-text-v-html-on-component': 'off',
      // Template formatting is handled by the team's formatter; keep lint focused on correctness.
      'vue/html-closing-bracket-spacing': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'no-console': 'warn'
    }
  }
]
