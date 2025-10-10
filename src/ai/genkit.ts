'use server';
import {configureGenkit, genkit, GenkitPlugin} from '@genkit-ai/core';
import {googleAI} from '@genkit-ai/googleai';

let ai: any;
const plugins: GenkitPlugin[] = [];

// This is the crucial change: only try to initialize if we have config AND we are on the client side.
const hasAllConfig = 
    process.env.GOOGLE_API_KEY;

if (hasAllConfig) {
  plugins.push(googleAI());
  configureGenkit({
    plugins,
  });
  ai = genkit;
} else {
  // On the server, OR if config is missing, create dummy objects.
  // This prevents server-side crashes and allows the UI to show the config warning if needed.
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      `\n[AlphaClub Warning] GOOGLE_API_KEY is not set in your .env file.
AI features will be disabled. Get a key from Google AI Studio and add it to .env to enable them.\n`
    );
  }
  // Create a no-op 'ai' object that won't crash the app.
  ai = {
    defineFlow: () => async () => undefined,
    definePrompt: () => async () => ({ output: null }),
    defineTool: () => async () => undefined,
  };
}


// The global 'ai' object is now used for defining flows, prompts, etc.
export {ai};
