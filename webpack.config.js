// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable import/no-commonjs */
module.exports = {
  entry: {
    blogsearch: './lib/index.js',
  },
  output: {
    library: 'blogsearch',
    libraryExport: 'default',
    libraryTarget: 'umd',
    globalObject: "typeof self !== 'undefined' ? self : this",
  },
  mode: 'development',
  module: {
    rules: [
      {
        enforce: 'pre',
        test: /\.(js|jsx|mjs)$/,
        exclude: [/node_modules/, /build/],
        use: 'eslint-loader',
      },
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
    // Webpack breaks .wasm file loading. So redefine the default rules
    // and remove the default .wasm rule.
    // See: https://github.com/webpack/webpack/blob/d5e26f728adb63a1fca080ef728fd627952a921d/lib/WebpackOptionsDefaulter.js#L83-L86
    // See: https://github.com/webpack/webpack/issues/6725
    defaultRules: [
			{
				type: 'javascript/auto',
				resolve: {},
			},
			{
				test: /\.json$/i,
				type: 'json',
			},
		],
  },
};
