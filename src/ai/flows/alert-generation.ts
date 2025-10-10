'use server';

/**
 * @fileOverview Generates alerts for expiring OBC documents like passports and visas.
 *
 * - generateDocumentExpiryAlert - A function that generates alerts for expiring documents.
 * - DocumentExpiryAlertInput - The input type for the generateDocumentExpiryAlert function.
 * - DocumentExpiryAlertOutput - The return type for the generateDocumentExpiryAlert function.
 */

import {ai} from '@/ai/genkit';
import { z } from 'zod';

const DocumentExpiryAlertInputSchema = z.object({
  documentType: z.enum(['passport', 'visa']).describe('The type of document to check for expiry.'),
  expiryDate: z.string().describe('The expiry date of the document (YYYY-MM-DD).'),
  userName: z.string().describe('The name of the document holder.'),
});
export type DocumentExpiryAlertInput = z.infer<typeof DocumentExpiryAlertInputSchema>;

const DocumentExpiryAlertOutputSchema = z.object({
  alertMessage: z.string().describe('The alert message to display to the administrator.'),
  urgencyLevel: z.enum(['high', 'medium', 'low']).describe('The urgency level of the alert.'),
});
export type DocumentExpiryAlertOutput = z.infer<typeof DocumentExpiryAlertOutputSchema>;

export async function generateDocumentExpiryAlert(input: DocumentExpiryAlertInput): Promise<DocumentExpiryAlertOutput> {
  return documentExpiryAlertFlow(input);
}

const prompt = ai.definePrompt({
  name: 'documentExpiryAlertPrompt',
  input: {schema: DocumentExpiryAlertInputSchema},
  output: {schema: DocumentExpiryAlertOutputSchema},
  prompt: `You are an alert generation system for document expiry.

  Generate an alert message based on the document type, expiry date, and user name provided.
  Also, determine the urgency level of the alert (high, medium, or low) based on how soon the document expires.

  Document Type: {{{documentType}}}
  Expiry Date: {{{expiryDate}}}
  User Name: {{{userName}}}

  Consider these factors:
  - High: Expires within 30 days.
  - Medium: Expires within 60 days.
  - Low: Expires within 90 days.
  `,
});

const documentExpiryAlertFlow = ai.defineFlow(
  {
    name: 'documentExpiryAlertFlow',
    inputSchema: DocumentExpiryAlertInputSchema,
    outputSchema: DocumentExpiryAlertOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
