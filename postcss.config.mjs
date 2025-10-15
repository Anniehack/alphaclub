import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import tailwindcssPostcss from '@tailwindcss/postcss'; // Import the new plugin

export default {
  plugins: {
    'postcss-import': {}, // Recommended for handling `@import` in CSS
    [tailwindcss]: {}, // Use the imported tailwindcss plugin
    [autoprefixer]: {}, // Use the imported autoprefixer plugin
    [tailwindcssPostcss]: {}, // Explicitly add the new PostCSS plugin for Tailwind
  },
};
