// @ts-nocheck
// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable import/no-commonjs */
const WrapperPlugin = require('wrapper-webpack-plugin');

/**
 * I'm making a UMD module myself for the following reasons:
 *  1. Before checking availabilities of module, define(), and ES6, it should
 *    initiate itself if it is run in the web worker environment.
 *  2. If none of above environments available it should be attacted to
 *    'blogsearch' object, which is already defined using <script> tag, as a
 *    plugin.
 */
/* global WorkerGlobalScope, define */
/* eslint-disable prettier/prettier, vars-on-top, no-var, dot-notation, no-param-reassign, no-console */
function workerUMD(root, factory) {
  if (typeof WorkerGlobalScope !== 'undefined' &&
    self instanceof WorkerGlobalScope) {
    var initWorker = factory();
    initWorker();
  }
  else if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["worker"] = factory();
	else {
		root["worker"] = factory();
    if (typeof blogsearch === 'undefined' || typeof blogsearch !== 'function')
      console.warn('blogsearch.worker may not be loaded correctly.');
  }
}
/* eslint-enable prettier/prettier, vars-on-top, no-var, dot-notation, no-param-reassign, no-console */

module.exports = {
  plugins: [
    new WrapperPlugin({
      afterOptimizations: true,
      test: /\.js$/,
      header: `
(
  ${workerUMD.toString()}
)(
  typeof blogsearch !== 'undefined' ? blogsearch : typeof self !== 'undefined' ? self : this,
  function() {
    return function() {`,
      // Worker Code (lib/worker.js) is placed here.
      footer: `
    }
  },
);`,
    }),
  ],
  entry: {
    worker: './lib/worker.js',
  },
  mode: 'development',
  module: {
    rules: [
      {
        enforce: 'pre',
        test: /\.(js|jsx|mjs)$/,
        type: 'javascript/auto',
        exclude: [/node_modules/, /build/],
        use: 'eslint-loader',
      },
      {
        test: /\.m?js$/,
        type: 'javascript/auto',
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
};
