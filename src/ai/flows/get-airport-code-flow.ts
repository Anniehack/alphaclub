'use server';

/**
 * @fileOverview A flow to find the nearest airport to a given set of coordinates.
 *
 * - getAirportCode - The function to find the nearest airport.
 * - AirportCodeInput - The input type for the getAirportCode function.
 * - AirportCodeOutput - The return type for the getAirportCode function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AirportCodeInputSchema = z.object({
  lat: z.number().describe('The latitude of the location.'),
  lon: z.number().describe('The longitude of the location.'),
});
export type AirportCodeInput = z.infer<typeof AirportCodeInputSchema>;

const AirportCodeOutputSchema = z.object({
  airportCode: z.string().describe('The 3-letter IATA code for the nearest airport.'),
});
export type AirportCodeOutput = z.infer<typeof AirportCodeOutputSchema>;

// This check ensures the tool is only defined when AI is properly configured.
const findNearestAirportTool = typeof ai.defineTool === 'function' ? ai.defineTool(
    {
      name: 'findNearestAirport',
      description: 'Finds the nearest airport to the given coordinates using a public API.',
      inputSchema: AirportCodeInputSchema,
      outputSchema: AirportCodeOutputSchema,
    },
    async ({ lat, lon }) => {
        // This is a free, open API for finding nearest airports using OpenStreetMap data. No API key needed.
        const overpassQuery = `
          [out:json];
          node(around:50000,${lat},${lon})[aeroway=aerodrome][iata];
          out 1;
        `;
        const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch airport data from Overpass API');
        }
        const data: any = await response.json();
        
        if (data.elements && data.elements.length > 0) {
          const airport = data.elements[0];
          return { airportCode: airport.tags.iata };
        }
        
        throw new Error('No airport with an IATA code found within 50km.');
    }
) : undefined;


const prompt = typeof ai.definePrompt === 'function' ? ai.definePrompt({
  name: 'getAirportCodePrompt',
  input: { schema: AirportCodeInputSchema },
  output: { schema: AirportCodeOutputSchema },
  tools: findNearestAirportTool ? [findNearestAirportTool] : [],
  prompt: `Based on the user's provided latitude ({{{lat}}}) and longitude ({{{lon}}}), find the nearest airport and return its 3-letter IATA code.`,
}) : undefined;

const getAirportCodeFlow = typeof ai.defineFlow === 'function' ? ai.defineFlow(
  {
    name: 'getAirportCodeFlow',
    inputSchema: AirportCodeInputSchema,
    outputSchema: AirportCodeOutputSchema,
  },
  async (input) => {
    if (!prompt) {
      throw new Error("AI prompt is not configured.");
    }
    const { output } = await prompt(input);
    return output!;
  }
) : undefined;

export async function getAirportCode(input: AirportCodeInput): Promise<AirportCodeOutput> {
  if (!getAirportCodeFlow) {
    throw new Error("AI features are not available. Please configure the API key.");
  }
  return getAirportCodeFlow(input);
}
