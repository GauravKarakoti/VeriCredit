/** @type {import('next').NextConfig} */

const webpack = require('webpack');
const path = require('path'); 
require('dotenv').config();

const nextConfig = {
  env: {
    APP_URL: process.env.URL, 
    TWITTER: process.env.TWITTER,
    DISCORD: process.env.DISCORD,
    RPC_URL: process.env.RPC_URL,
  },
  reactStrictMode: true,
  ...(process.env.NODE_ENV === 'production' && {
    typescript: {
      ignoreBuildErrors: true,
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
  }),
  webpack: (config) => {
    config.ignoreWarnings = [/Failed to parse source map/];
    
    // 1. Resolve missing node modules for the browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      stream: require.resolve('stream-browserify'),
      fs: false,     // Replaced browserify-fs with 'false' to avoid edge-runtime crashes
      path: false,   // Replaced path-browserify with 'false'
      crypto: false, // Replaced crypto-browserify with 'false'
    };

    // 2. Inject global polyfills
    config.plugins.push(
      new webpack.ProvidePlugin({
        process: 'process/browser',
        Buffer: ['buffer', 'Buffer'],
      })
    );

    // 3. Enable Native Next.js WASM Support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      topLevelAwait: true,
      layers: true,
    };

    // 4. Correctly alias the Provable generated bindings
    config.resolve.alias = {
      ...config.resolve.alias,
      'wbg': path.resolve(__dirname, 'node_modules/@provablehq/wasm/dist/testnet/index.js'),
    };

    return config;
  },
};

module.exports = nextConfig;