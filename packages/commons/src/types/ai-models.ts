import { z } from 'zod';

export const SUPPORTED_API_MODELS = [
  'gemini-3-pro-preview',
  'gemini-2.5-pro',
  'gemini-2.5-flash-image-preview',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
] as const;

export const ThinkingCapacity = z.enum(['high', 'low']);

export const ThinkingMode = {
  DISABLED: 'disabled',
  OPTIONAL: 'optional',
  FORCED: 'forced',
} as const;

export const ThinkingConfigType = {
  TOKEN_LIMIT: 'token_limit',
  PRESET: 'preset',
} as const;

export const DYNAMIC_TOKEN_BUDGET = -1;

export const THINKING_DEFAULT_STATE = {
  ON: 'on',
  OFF: 'off',
  DYNAMIC: 'dynamic',
} as const;

const DisabledThinkingSchema = z.object({
  mode: z.literal(ThinkingMode.DISABLED),
  defaultState: z.literal(THINKING_DEFAULT_STATE.OFF),
  configType: z.null().optional(),
  defaultBudget: z.null(),
  limits: z.null().optional(),
});

const BaseThinkingSchema = z
  .object({
    mode: z.enum([ThinkingMode.OPTIONAL, ThinkingMode.FORCED]),
    defaultState: z.enum(THINKING_DEFAULT_STATE),
    availableThinkingStates: z.array(z.enum(THINKING_DEFAULT_STATE)),
  })
  .refine(
    (data) =>
      !(
        data.mode === ThinkingMode.FORCED &&
        data.defaultState === THINKING_DEFAULT_STATE.OFF
      ),
    {
      message: "Forced thinking mode cannot have a default state of 'OFF'",
      path: ['defaultState'],
    },
  );

const PresetThinkingSchema = BaseThinkingSchema.and(
  z.object({
    configType: z.literal(ThinkingConfigType.PRESET),
    defaultBudget: ThinkingCapacity,
    availablePresets: z.array(ThinkingCapacity),
    limits: z.null().optional(),
  }),
);

const TokenLimitThinkingSchema = BaseThinkingSchema.and(
  z.object({
    configType: z.literal(ThinkingConfigType.TOKEN_LIMIT),
    defaultBudget: z.number(),
    limits: z.object({
      min: z.number(),
      max: z.number(),
    }),
  }),
).refine(
  (data) => {
    if (data.defaultBudget !== DYNAMIC_TOKEN_BUDGET) {
      return (
        data.defaultBudget >= data.limits.min &&
        data.defaultBudget <= data.limits.max
      );
    }
    return true;
  },
  {
    message: 'Default budget must be within limits or set to -1 (Dynamic)',
    path: ['defaultBudget'],
  },
);

export const ModelConfigSchema = z.object({
  id: z.uuid(),
  apiModel: z.enum(SUPPORTED_API_MODELS),
  title: z.string(),
  capabilities: z.object({
    multiTurn: z.boolean().default(true),
    thinking: z.union([
      DisabledThinkingSchema,
      PresetThinkingSchema,
      TokenLimitThinkingSchema,
    ]),
  }),
});

export type ModelConfig = z.infer<typeof ModelConfigSchema>;
export type ThinkingConfig = ModelConfig['capabilities']['thinking'];
export type Model = ModelConfig['apiModel'];

type PresetThinkingConfig = z.infer<typeof PresetThinkingSchema>;
export type PresetThinkingCapacity = PresetThinkingConfig['defaultBudget'];

export type ThinkingDefaultState =
  (typeof THINKING_DEFAULT_STATE)[keyof typeof THINKING_DEFAULT_STATE];
