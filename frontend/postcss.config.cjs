const tailwindConfig = require('./tailwind.config.cjs');

module.exports = {
  plugins: {
    // pass config object directly to avoid tailwind attempting to require a .js config file
    tailwindcss: tailwindConfig,
    autoprefixer: {},
  },
};
