// Configure i18n
const path = require('path');
const i18n = require('i18n');

i18n.configure({
  directory: path.resolve(process.cwd(), 'locales'),
  defaultLocale: 'en',
});

module.exports = i18n;
