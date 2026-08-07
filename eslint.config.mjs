import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import promise from 'eslint-plugin-promise';
import security from 'eslint-plugin-security';
import unicorn from 'eslint-plugin-unicorn';

const sharedPlugins = {
  react,
  'react-hooks': reactHooks,
  'jsx-a11y': jsxA11y,
  import: importPlugin,
  promise,
  security,
  unicorn,
};

const sharedRules = {
  'no-undef': 'error',
  'no-eval': 'error',
  'no-implied-eval': 'error',
  'no-new-func': 'error',
  'no-unsafe-finally': 'error',
  'no-prototype-builtins': 'error',
  'no-var': 'error',
  'prefer-const': 'error',
  eqeqeq: ['error', 'always', { null: 'ignore' }],
  'no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
      ignoreRestSiblings: true,
    },
  ],
  'react/jsx-uses-react': 'off',
  'react/react-in-jsx-scope': 'off',
  'react/jsx-uses-vars': 'error',
  'react/jsx-key': 'error',
  'react/no-danger': 'error',
  'react/no-unknown-property': 'error',
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'error',
  'jsx-a11y/alt-text': 'error',
  'jsx-a11y/anchor-is-valid': 'error',
  'jsx-a11y/click-events-have-key-events': 'error',
  'jsx-a11y/no-static-element-interactions': 'error',
  'jsx-a11y/label-has-associated-control': 'error',
  'import/no-duplicates': 'error',
  'import/no-cycle': ['error', { maxDepth: 2 }],
  'import/no-mutable-exports': 'error',
  'promise/no-return-wrap': 'error',
  'promise/param-names': 'error',
  'promise/no-multiple-resolved': 'error',
  'security/detect-eval-with-expression': 'error',
  'security/detect-child-process': 'error',
  'security/detect-new-buffer': 'error',
  'security/detect-object-injection': 'off',
  'unicorn/no-process-exit': 'off',
  'unicorn/prefer-module': 'off',
  'unicorn/filename-case': 'off',
  'unicorn/prevent-abbreviations': 'off',
  'unicorn/no-null': 'off',
  'unicorn/no-array-reduce': 'off',
  'unicorn/prefer-top-level-await': 'off',
};

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'reports/**',
      'coverage/**',
      'coverage-project/**',
      'public/**',
      'supabase/generated/**',
      'vendor/**',
      'brand-quarantine/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node, ...globals.es2022 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: {
      react: { version: '18.3' },
      'import/resolver': { node: { extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'] } },
    },
    plugins: sharedPlugins,
    rules: sharedRules,
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  })),
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node, ...globals.es2022 },
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        projectService: true,
      },
    },
    settings: {
      react: { version: '18.3' },
      'import/resolver': { node: { extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'] } },
    },
    plugins: { ...sharedPlugins, '@typescript-eslint': tseslint.plugin },
    rules: {
      ...sharedRules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },
  {
    files: ['tests/**', 'e2e/**'],
    rules: {
      'no-undef': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-child-process': 'off',
    },
  },
  {
    files: ['scripts/**'],
    rules: {
      'security/detect-child-process': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      'unicorn/no-process-exit': 'off',
    },
  },
];
