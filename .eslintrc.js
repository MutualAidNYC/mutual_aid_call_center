module.exports = {
  extends: ['airbnb'],
  rules: {
    'no-unused-vars': ['error', { varsIgnorePattern: '_.+' }],
    'no-underscore-dangle': ['off'],
    'no-console': ['off'],
    radix: ['off'], //fixed in ES5
  },
  extends: ['airbnb-base', 'plugin:prettier/recommended'],
  plugins: ['prettier', 'promise'],
  env: {
    mocha: true,
    node: true,
  },
};
