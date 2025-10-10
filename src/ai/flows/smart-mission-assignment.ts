'use server';

/**
 * @fileOverview Implements the smart mission assignment flow.
 *
 * - smartMissionAssignment - A function that suggests the best OBC for a new mission.
 * - SmartMissionAssignmentInput - The input type for the smartMissionAssignment function.
 * - SmartMissionAssignmentOutput - The return type for the smartMissionAssignment function.
 */

import {ai} from '@/ai/genkit';
import { z } from 'zod';

const SmartMissionAssignmentInputSchema = z.object({
  missionDetails: z.string().describe('Details of the mission including origin and destination.'),
  availableOBCs: z.array(z.object({
    obcId: z.string().describe('The unique identifier of the OBC.'),
    currentLocation: z.string().describe('The current location of the OBC.'),
    availability: z.string().describe('The availability status of the OBC (e.g., available, busy).'),
    specialization: z.string().describe('The specialization of the OBC (e.g., documents, valuables).'),
    passportExpiry: z.string().describe('The OBC passport expiry date in ISO format (YYYY-MM-DD).'),
    visaExpiry: z.string().describe('The OBC visa expiry date in ISO format (YYYY-MM-DD).'),
  })).describe('A list of available OBCs with their details.'),
});
export type SmartMissionAssignmentInput = z.infer<typeof SmartMissionAssignmentInputSchema>;

const SmartMissionAssignmentOutputSchema = z.object({
  suggestedObcId: z.string().describe('The ID of the suggested OBC for the mission.'),
  reason: z.string().describe('The reason for suggesting the OBC.'),
});
export type SmartMissionAssignmentOutput = z.infer<typeof SmartMissionAssignmentOutputSchema>;

export async function smartMissionAssignment(input: SmartMissionAssignmentInput): Promise<SmartMissionAssignmentOutput> {
  return smartMissionAssignmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'smartMissionAssignmentPrompt',
  input: {schema: SmartMissionAssignmentInputSchema},
  output: {schema: SmartMissionAssignmentOutputSchema},
  prompt: `You are an expert in mission assignment, tasked with suggesting the best OBC (On Board Courier) for a given mission.

  Consider the following mission details:
  Mission Details: {{{missionDetails}}}

  Available OBCs:
  {{#each availableOBCs}}
  - OBC ID: {{this.obcId}}, Location: {{this.currentLocation}}, Availability: {{this.availability}}, Specialization: {{this.specialization}}, Passport Expiry: {{this.passportExpiry}}, Visa Expiry: {{this.visaExpiry}}
  {{/each}}

  Given the mission details and the available OBCs, suggest the most suitable OBC ID and provide a reason for your suggestion. Consider location, availability, specialization, and document expiry dates.
  Format your response as a JSON object with "suggestedObcId" and "reason" fields.
  `,
});

const smartMissionAssignmentFlow = ai.defineFlow(
  {
    name: 'smartMissionAssignmentFlow',
    inputSchema: SmartMissionAssignmentInputSchema,
    outputSchema: SmartMissionAssignmentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
