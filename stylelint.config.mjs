/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  ignoreFiles: [
    '**/node_modules/**',
    '**/dist/**',
    '**/coverage/**',
    '**/coverage-project/**',
    '**/reports/**',
    '**/public/**',
    '**/vendor/**',
    '**/brand-quarantine/**',
  ],
  rules: {
    /* Design tokens use custom properties extensively; allow unknown at-rules from future CSS. */
    'custom-property-pattern': null,
    'selector-class-pattern': null,
    'selector-id-pattern': null,
    'keyframes-name-pattern': null,
    'no-descending-specificity': null,
    'import-notation': 'string',
    'color-function-notation': null,
    'alpha-value-notation': null,
    'hue-degree-notation': null,
    'media-feature-range-notation': null,
    'declaration-property-value-no-unknown': null,
    'declaration-block-no-redundant-longhand-properties': null,
    /* Logical properties preferred; keep physical only when intentional later. */
    'property-no-vendor-prefix': null,
    'value-no-vendor-prefix': null,
    'function-url-quotes': 'always',
    'comment-empty-line-before': null,
    'rule-empty-line-before': null,
    'custom-property-empty-line-before': null,
    'declaration-empty-line-before': null,
    'at-rule-empty-line-before': null,
    'number-max-precision': 6,
  },
};
