// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import eslintNestJs from '@darraghor/eslint-plugin-nestjs-typed';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  sonarjs.configs.recommended,
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
    },
  },
  eslintNestJs.configs.flatRecommended,
  {
    rules: {
      // Составной декоратор из `src/common/helpers/decorators`.
      '@darraghor/nestjs-typed/api-method-should-specify-api-response': [
        'error',
        { additionalCustomApiResponseDecorators: ['ApiSerialized'] },
      ],
      // Составной декоратор из `src/common/validators`.
      '@darraghor/nestjs-typed/all-properties-are-whitelisted': [
        'error',
        { additionalDecorators: ['IsPassword'] },
      ],
      '@darraghor/nestjs-typed/all-properties-have-explicit-defined': [
        'error',
        { additionalDecorators: ['IsPassword'] },
      ],
    },
  },
  {
    files: [
      '**/*.spec.ts',
      '**/*.int-spec.ts',
      '**/*.e2e-spec.ts',
      'test/**/*.ts',
    ],
    rules: { 'sonarjs/no-hardcoded-passwords': 'off' },
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'default', format: ['camelCase'] },
        {
          selector: 'variable',
          format: ['PascalCase', 'UPPER_CASE'],
          types: ['boolean'],
          prefix: ['is', 'should', 'has', 'can', 'did', 'will'],
        },
        {
          selector: 'variableLike',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
        },
        {
          selector: 'parameter',
          format: ['camelCase'],
        },
        {
          selector: 'memberLike',
          modifiers: ['private'],
          format: ['camelCase'],
          leadingUnderscore: 'forbid',
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
          filter: { regex: '\\d{10}$', match: false },
        },
        {
          selector: 'property',
          modifiers: ['readonly'],
          format: ['camelCase'],
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE'],
        },
      ],
    },
  },
  {
    languageOptions: { globals: globals.builtin },
    plugins: { unicorn },
    rules: {
      'unicorn/prefer-node-protocol': 'off',
      'unicorn/filename-case': 'off',
      'unicorn/prevent-abbreviations': [
        'error',
        {
          checkFilenames: false,
          replacements: {
            e: {},
            e2e: { checkFilenames: false },
            res: false,
            db: false,
            cmd: { command: true },
            errCb: { handleError: true },
          },
        },
      ],
    },
  },
);
