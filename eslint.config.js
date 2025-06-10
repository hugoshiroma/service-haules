import js from '@eslint/js'
import prettierPlugin from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'

export default [
  js.configs.recommended,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error', // Mostra erros de formatação como erros de lint
      'no-unused-vars': 'error',
      'no-extra-non-null-assertion': 'error',
    },
  },
  prettierConfig, // Desativa regras do ESLint que conflitam com o Prettier
]
