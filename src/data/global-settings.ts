import type { GlobalSettings, ModelConfig, UserRole } from '@ishtar/commons';
import { allModels, basicModels, guestModels, modelIds } from './models.ts';

export const getGlobalSettings = (role: UserRole): GlobalSettings => {
  const models: Record<string, ModelConfig> = Object.fromEntries(
    (role === 'admin'
      ? allModels
      : role === 'guest'
        ? guestModels
        : basicModels
    ).map((model) => [model.id, model]),
  );

  return {
    models,
    defaultModelId:
      role === 'admin'
        ? modelIds.GEMINI_2_5_FLASH
        : modelIds.GEMINI_2_5_FLASH_LITE,
    supportedModelIds: Object.keys(models),
    temperature: 1,
  };
};
