module.exports = {
  "extends": [
    "standard-with-typescript",
    "plugin:eslint-comments/recommended",
    "plugin:jsdoc/recommended",
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
  "rules": {
    // Semistandard
    "semi": [2, "always"],
    "no-extra-semi": 2,
    // Semistandard for Typescript
    "@typescript-eslint/member-delimiter-style": [
      "error", 
      {
        "multiline": {
            "delimiter": "semi",
            "requireLast": true
        },
        "singleline": {
            "delimiter": "semi",
            "requireLast": false
        }
      },
    ],
    // JS / Common
    "no-useless-return": ["off"],
    "comma-dangle": ["error", "only-multiline"],
    "no-console": ["warn"],
    // JS rules that conflicts with Typescript
    "no-dupe-class-members": ["off"],
    // Typescript
    "@typescript-eslint/strict-boolean-expressions": ["off"],
    "@typescript-eslint/explicit-function-return-type": ["off"],
    "@typescript-eslint/restrict-template-expressions": ["off"],
    "@typescript-eslint/no-namespace": ["off"],
    "@typescript-eslint/ban-ts-comment": ["warn"],
    "@typescript-eslint/promise-function-async": [
      "error",
      {
        "allowedPromiseNames": ["Thenable"],
        "checkArrowFunctions": false,
        "checkFunctionDeclarations": true,
        "checkFunctionExpressions": true,
        "checkMethodDeclarations": true
      }
    ],
  }
};
