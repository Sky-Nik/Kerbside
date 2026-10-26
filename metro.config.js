// https://docs.expo.dev/versions/latest/sdk/sqlite/#web-setup
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite on web runs a wasm build that needs SharedArrayBuffer,
// which browsers only allow with these isolation headers.
config.resolver.assetExts.push('wasm');
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  middleware(req, res, next);
};

module.exports = config;
