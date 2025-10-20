// postcss.config.mjs
// Explicitly import and use the PostCSS wrapper plugin for Tailwind CSS
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import tailwindcssPostcss from '@tailwindcss/postcss'; // Import the new wrapper

export default {
  plugins: {
    'postcss-import': {}, // Standard for handling @import
    // Use the explicit @tailwindcss/postcss wrapper, passing tailwindcss as a function
    [tailwindcssPostcss]: { tailwindcss }, // This format should satisfy the error
    [autoprefixer]: {},
  },
};

