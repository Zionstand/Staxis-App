// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");
const staxisPlugin = require("./eslint-plugin-staxis");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    plugins: { staxis: staxisPlugin },
    rules: {
      "staxis/no-raw-colors": "error",
      "staxis/no-raw-style-values": "warn",
    },
  },
]);
