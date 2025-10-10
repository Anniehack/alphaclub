import { config } from 'dotenv';
config();

import '@/ai/flows/alert-generation.ts';
import '@/ai/flows/send-welcome-email.ts';
import '@/ai/flows/get-airport-code-flow.ts';
