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

const shared = {
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    globals: { ...globals.browser, ...globals.node, ...globals.es2022 },
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
  settings: { react: { version: '18.3' }, 'import/resolver': { node: { extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs'] } } },
  plugins: { react, 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y, import: importPlugin, promise, security, unicorn },
  rules: {
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-unsafe-finally': 'error',
    'no-prototype-builtins': 'error',
    'eqeqeq': ['error', 'always', { null: 'ignore' }],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/anchor-is-valid': 'error',
    'jsx-a11y/click-events-have-key-events': 'error',
    'jsx-a11y/no-static-element-interactions': 'error',
    'import/no-cycle': ['error', { maxDepth: 2 }],
    'import/no-duplicates': 'error',
    'promise/no-return-wrap': 'error',
    'promise/param-names': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-child-process': 'error',
    'security/detect-object-injection': 'off',
    'unicorn/no-process-exit': 'off',
    'unicorn/prefer-module': 'off',
    'unicorn/filename-case': 'off',
    'unicorn/prevent-abbreviations': 'off',
    'unicorn/no-null': 'off',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
  },
};

export default [
  { ignores: ['dist/**', 'node_modules/**', 'reports/**', 'coverage/**', 'coverage-project/**', 'public/**', 'supabase/generated/**', 'vendor/**'] },
  js.configs.recommended,
  { files: ['**/*.{js,jsx,mjs,cjs}'], ...shared },
  ...tseslint.configs.recommended.map((config) => ({ ...config, files: ['**/*.{ts,tsx}'] })),
  { files: ['**/*.{ts,tsx}'], ...shared, languageOptions: { ...shared.languageOptions, parser: tseslint.parser, parserOptions: { ...shared.languageOptions.parserOptions, projectService: true } }, rules: { ...shared.rules, '@typescript-eslint/no-floating-promises': 'error', '@typescript-eslint/no-misused-promises': 'error', '@typescript-eslint/strict-boolean-expressions': 'error' } },
  { files: ['tests/**', 'e2e/**'], rules: { 'no-undef': 'off', 'security/detect-non-literal-fs-filename': 'off' } },
  { files: ['scripts/**'], rules: { 'security/detect-child-process': 'off', 'security/detect-non-literal-fs-filename': 'off', 'unicorn/no-process-exit': 'off' } },
];
