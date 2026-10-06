const noRawColors = require('./rules/no-raw-colors');
const noRawStyleValues = require('./rules/no-raw-style-values');

const plugin = {
  meta: { name: 'eslint-plugin-staxis', version: '1.0.0' },
  rules: {
    'no-raw-colors': noRawColors,
    'no-raw-style-values': noRawStyleValues,
  },
};

module.exports = plugin;
