// ai-models.ts
import { z } from 'zod';

// Enums for capability logic
export const ThinkingMode = {
  DISABLED: 'disabled', // e.g. Nano
  OPTIONAL: 'optional', // e.g. Flash
  FORCED: 'forced', // e.g. Pro (if it must think)
} as const;

export const ThinkingConfigType = {
  TOKEN_LIMIT: 'token_limit', // Standard user input number
  PRESET: 'preset', // High/Low (Gemini 3 Pro style)
} as const;

// The Zod Schema
export const ModelConfigSchema = z.object({
  id: z.uuidv4(), // Internal DB ID
  apiModel: z.string(), // The actual string sent to Google API
  title: z.string(),

  // Configuration for capabilities
  capabilities: z.object({
    vision: z.boolean().default(false),
    multiTurn: z.boolean().default(true),

    thinking: z.object({
      mode: z.nativeEnum(ThinkingMode),
      configType: z.nativeEnum(ThinkingConfigType).optional(),
      defaultBudget: z.union([z.number(), z.enum(['high', 'low'])]).nullable(),
    }),
  }),
});

export type ModelConfig2 = z.infer<typeof ModelConfigSchema>;
export type ThinkingModeType = (typeof ThinkingMode)[keyof typeof ThinkingMode];
