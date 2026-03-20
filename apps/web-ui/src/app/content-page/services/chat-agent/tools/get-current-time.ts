import { Injectable } from '@angular/core';
import { DynamicStructuredTool } from 'langchain/tools';
import { z } from 'zod';

export const CurrentTimeInputSchema = z.object({});

export const CurrentTimeOutputSchema = z.object({
  timestamp: z
    .string()
    .describe(
      "The timestamp in ISO format. An example is '2025-09-27T23:45:30.123Z' which is September 27, 2025 in Zulu time.",
    ),
});

export type CurrentTimeOutput = z.infer<typeof CurrentTimeOutputSchema>;

@Injectable({ providedIn: 'root' })
export class CurrentTimeTool extends DynamicStructuredTool {
  constructor() {
    super({
      name: 'CurrentTimeTool',
      description: 'Tool that returns the current time',
      schema: CurrentTimeInputSchema,
      func: async (): Promise<CurrentTimeOutput> => {
        return { timestamp: new Date().toISOString() };
      },
    });
  }
}
