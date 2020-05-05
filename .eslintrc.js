module.exports = {
  extends: [
    '../.eslintrc.js'
  ],
  parserOptions: {
      project: [
        './blogsearch/tsconfig.json',
        './blogsearch/tsconfig.test.json'
      ]
  },
  ignorePatterns: [
    'dist/*',
    'lib/*',
    'lib-test/*',
  ],
};
