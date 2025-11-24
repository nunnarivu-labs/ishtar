import { ModelConfig, ModelConfigSchema, ThinkingMode } from './ai-models';

export const modelIds = {
  GEMINI_3_PRO: '2f87dde7-12c8-455f-b8bf-42c82abf8c87',
  GEMINI_2_5_PRO: '972410fa-58f2-48a5-866e-0535dff3ae96',
  NANO_BANANA: '1b579c85-1a86-4cef-a13d-9cc9ad13b568',
  GEMINI_2_5_FLASH: '39e333be-2b16-4de3-bb4e-78061a753e94',
  GEMINI_2_5_FLASH_LITE: 'fa27f1b4-ea4d-4b62-9884-fa69c5276cb1',
};

const allModelsRaw: ModelConfig[] = [
  {
    id: modelIds.GEMINI_3_PRO,
    title: 'Gemini 3 Pro Preview',
    apiModel: 'gemini-3-pro-preview',
    capabilities: {
      multiTurn: true,
      thinking: {
        mode: ThinkingMode.FORCED,
        defaultState: 'on',
        availableThinkingStates: ['on'],
        configType: 'preset',
        defaultBudget: 'high',
        availablePresets: ['high', 'low'],
      },
    },
  },
  {
    id: modelIds.GEMINI_2_5_PRO,
    title: 'Gemini 2.5 Pro',
    apiModel: 'gemini-2.5-pro',
    capabilities: {
      multiTurn: true,
      thinking: {
        mode: ThinkingMode.FORCED,
        defaultState: 'on',
        availableThinkingStates: ['dynamic', 'on'],
        configType: 'token_limit',
        defaultBudget: 128,
        limits: {
          min: 128,
          max: 32768,
        },
      },
    },
  },
  {
    id: modelIds.GEMINI_2_5_FLASH,
    title: 'Gemini 2.5 Flash',
    apiModel: 'gemini-2.5-flash',
    capabilities: {
      multiTurn: true,
      thinking: {
        mode: ThinkingMode.OPTIONAL,
        defaultState: 'on',
        availableThinkingStates: ['off', 'dynamic', 'on'],
        configType: 'token_limit',
        defaultBudget: 1,
        limits: {
          min: 1,
          max: 24576,
        },
      },
    },
  },
  {
    id: modelIds.GEMINI_2_5_FLASH_LITE,
    title: 'Gemini 2.5 Flash Lite',
    apiModel: 'gemini-2.5-flash-lite',
    capabilities: {
      multiTurn: true,
      thinking: {
        mode: ThinkingMode.OPTIONAL,
        defaultState: 'on',
        availableThinkingStates: ['off', 'dynamic', 'on'],
        configType: 'token_limit',
        defaultBudget: 512,
        limits: {
          min: 512,
          max: 24576,
        },
      },
    },
  },
  {
    id: modelIds.NANO_BANANA,
    title: 'Gemini 2.5 Flash Image (Nano Banana)',
    apiModel: 'gemini-2.5-flash-image-preview',
    capabilities: {
      multiTurn: true,
      thinking: {
        mode: ThinkingMode.DISABLED,
        defaultState: 'off',
        defaultBudget: null,
      },
    },
  },
];

const guestModelsRaw: ModelConfig[] = [
  {
    id: modelIds.GEMINI_2_5_FLASH,
    title: 'Gemini 2.5 Flash',
    apiModel: 'gemini-2.5-flash',
    capabilities: {
      multiTurn: true,
      thinking: {
        mode: ThinkingMode.OPTIONAL,
        defaultState: 'off',
        availableThinkingStates: ['off', 'dynamic', 'on'],
        configType: 'token_limit',
        defaultBudget: 1,
        limits: {
          min: 1,
          max: 24576,
        },
      },
    },
  },
  {
    id: modelIds.GEMINI_2_5_FLASH_LITE,
    title: 'Gemini 2.5 Flash Lite',
    apiModel: 'gemini-2.5-flash-lite',
    capabilities: {
      multiTurn: true,
      thinking: {
        mode: ThinkingMode.OPTIONAL,
        defaultState: 'off',
        availableThinkingStates: ['off', 'dynamic', 'on'],
        configType: 'token_limit',
        defaultBudget: 512,
        limits: {
          min: 512,
          max: 24576,
        },
      },
    },
  },
];

const basicModelsRaw: ModelConfig[] = [
  {
    id: modelIds.GEMINI_2_5_FLASH,
    title: 'Gemini 2.5 Flash',
    apiModel: 'gemini-2.5-flash',
    capabilities: {
      multiTurn: false,
      thinking: {
        mode: ThinkingMode.OPTIONAL,
        defaultState: 'off',
        availableThinkingStates: ['off', 'dynamic', 'on'],
        configType: 'token_limit',
        defaultBudget: 1,
        limits: {
          min: 1,
          max: 24576,
        },
      },
    },
  },
  {
    id: modelIds.GEMINI_2_5_FLASH_LITE,
    title: 'Gemini 2.5 Flash Lite',
    apiModel: 'gemini-2.5-flash-lite',
    capabilities: {
      multiTurn: false,
      thinking: {
        mode: ThinkingMode.OPTIONAL,
        defaultState: 'off',
        availableThinkingStates: ['off', 'dynamic', 'on'],
        configType: 'token_limit',
        defaultBudget: 512,
        limits: {
          min: 512,
          max: 24576,
        },
      },
    },
  },
];

export const allModels = allModelsRaw.map((model) =>
  ModelConfigSchema.parse(model),
);

export const guestModels = guestModelsRaw.map((model) =>
  ModelConfigSchema.parse(model),
);

export const basicModels = basicModelsRaw.map((model) =>
  ModelConfigSchema.parse(model),
);

export const modelsObject: Record<string, ModelConfig> = Object.fromEntries(
  allModels.map((model) => [model.id, model]),
);
