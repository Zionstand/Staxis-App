require('./scripts/dependency-patches.cjs').verify();
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Agent checkouts are separate projects, not sources for this app. Keep their
// duplicate packages out of Metro's file map while preserving Expo exclusions.
const defaults = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(defaults) ? defaults : defaults ? [defaults] : []),
  /(?:^|[/\\])\.claude[/\\]worktrees(?:[/\\].*)?$/,
];

module.exports = config;
