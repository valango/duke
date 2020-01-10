module.exports = {
  root: true,
  parserOptions: {
    // ecmaFeatures: {impliedStrict: true},
    // ecmaVersion: 5,
    sourceType: 'module'
  },
  env: {
    // es6: true,
    node: true
  },
  extends: [
    // https://github.com/standard/standard/blob/master/docs/RULES-en.md
    'standard'
  ],
  // add your custom rules here
  rules: {
    // allow async-await
    // 'generator-star-spacing': 'off',

    // allow paren-less arrow functions
    // 'arrow-parens': 0,
    'one-var': 0,

    // 'import/first': 0,
    // 'import/named': 2,
    // 'import/namespace': 2,
    // 'import/default': 2,
    // 'import/export': 2,
    // 'import/extensions': 0,
    // 'import/no-unresolved': 0,
    // 'import/no-extraneous-dependencies': 0,
    'no-var': 2,
    'no-console': 1,
    'no-multi-spaces': 0,
    'no-proto': 1,
    'no-unused-vars': 1,
    'no-useless-catch': 1,

    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,

    'no-unreachable': 1,
    'no-useless-return': 1,
    'object-curly-spacing': 0,
    'quotes': ['error', 'single', { avoidEscape: true }]
  }
}
