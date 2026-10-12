const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Explicitly add support for vector fonts on the web
config.resolver.assetExts.push('ttf');

module.exports = config;