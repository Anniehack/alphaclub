'use server';

/**
 * @fileOverview A flow to generate and "send" a welcome email to a newly approved OBC.
 *
 * - sendWelcomeEmail - The function to trigger the welcome email process.
 * - WelcomeEmailInput - The input type for the flow.
 * - WelcomeEmailOutput - The return type for the flow.
 */

import {ai} from '@/ai/genkit';
import { z } from 'zod';
import { Resend } from 'resend';

const WelcomeEmailInputSchema = z.object({
  name: z.string().describe('The name of the new OBC.'),
  email: z.string().email().describe('The email address of the new OBC.'),
  obcNumber: z.string().describe('The newly generated unique OBC number.'),
});
export type WelcomeEmailInput = z.infer<typeof WelcomeEmailInputSchema>;

const WelcomeEmailOutputSchema = z.object({
    subject: z.string(),
    body: z.string(),
});
export type WelcomeEmailOutput = z.infer<typeof WelcomeEmailOutputSchema>;

export async function sendWelcomeEmail(input: WelcomeEmailInput): Promise<{success: boolean; message: string}> {
    console.log(`Generating welcome email for ${input.name} (${input.email}) with OBC# ${input.obcNumber}`);
    
    const { output } = await sendWelcomeEmailFlow(input);
    
    if (output) {
        try {
            if (!process.env.RESEND_API_KEY) {
                console.warn("RESEND_API_KEY is not set. Email will be logged to console instead of sent.");
                console.log('--- SIMULATED EMAIL ---');
                console.log(`To: ${input.email}`);
                // NOTE: onboarding@resend.dev is a special address that works for testing.
                console.log(`From: 'onboarding@resend.dev'`);
                console.log(`Subject: ${output.subject}`);
                console.log(`Body: ${output.body}`);
                console.log('-------------------------');
                return { success: true, message: `Welcome email for ${input.name} generated (simulated).` };
            }
            
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
                from: 'onboarding@resend.dev', // IMPORTANT: You must verify a domain with Resend to use a custom 'from' address.
                to: input.email,
                subject: output.subject,
                html: output.body.replace(/\n/g, '<br>'), // Convert newlines to breaks for HTML emails
            });
            return { success: true, message: `Welcome email sent to ${input.email}` };
        } catch (error) {
            console.error("Failed to send email via Resend:", error);
            return { success: false, message: 'Failed to send welcome email.' };
        }
    }
    
    return { success: false, message: 'Failed to generate email content.' };
}

const prompt = ai.definePrompt({
    name: 'welcomeEmailPrompt',
    input: { schema: WelcomeEmailInputSchema },
    output: { schema: WelcomeEmailOutputSchema },
    prompt: `You are an onboarding assistant for AlphaClub, a logistics company.
    
    Your task is to generate a welcome email for a newly approved On-Board Courier (OBC).
    
    The email should be friendly, professional, and welcoming. It must include their new unique OBC Number.
    
    Use the following information:
    - New Courier's Name: {{{name}}}
    - New Courier's OBC Number: {{{obcNumber}}}
    
    The subject line should be "Welcome to the AlphaClub Team!".
    The body should congratulate them on their approval, provide their OBC number, and give them a brief next step (e.g., "You can now log in to the app with your credentials.").
    `,
});

const sendWelcomeEmailFlow = ai.defineFlow(
  {
    name: 'sendWelcomeEmailFlow',
    inputSchema: WelcomeEmailInputSchema,
    outputSchema: WelcomeEmailOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
