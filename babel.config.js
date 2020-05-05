/* eslint-disable import/no-commonjs */
module.exports = api => {
  const isTest = api.env('test');
  if (isTest) {
    // For Jest testing environment
    return {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current',
            },
          },
        ],
      ],
    };
  } else {
    // For WebPack targeting UMD and others
    return {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              browsers: ['last 2 versions'],
            },
            modules: 'umd',
            useBuiltIns: 'usage',
            corejs: 3,
          },
        ],
      ],
      plugins: [
        [
          '@babel/plugin-transform-runtime',
          {
            absoluteRuntime: true,
            corejs: 3,
            helpers: true,
            regenerator: true,
            useESModules: false,
          },
        ],
      ],
    };
  }
};
/* eslint-enable import/no-commonjs */
