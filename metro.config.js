// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// `markdown-it` (via react-native-markdown-display) does `require('punycode')`,
// which is a Node core module that React Native does not ship. Redirect it to
// the userland `punycode` package (pure JS, same API) so bundling succeeds.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  punycode: require.resolve('punycode/'),
};

module.exports = config;
