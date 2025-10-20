// postcss.config.js
module.exports = {
  plugins: {
    // This is the direct change: reference the new package name here
    '@tailwindcss/postcss': {},
    autoprefixer: {},
    // 'postcss-import': {}, // Often included, but sometimes it's implied or handled by Next.js.
                            // Let's keep it minimal for now to isolate the Tailwind issue.
  },
};

