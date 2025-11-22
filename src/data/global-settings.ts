import type { GlobalSettings, UserRole } from '@ishtar/commons/types';
import { modelIds } from './models.ts';

export const getGlobalSettings = (role: UserRole): GlobalSettings => ({
  defaultModel:
    role === 'admin'
      ? modelIds.GEMINI_2_5_FLASH
      : modelIds.GEMINI_2_5_FLASH_LITE,
  supportedModels:
    role === 'admin'
      ? Object.values(modelIds)
      : [modelIds.GEMINI_2_5_FLASH, modelIds.GEMINI_2_5_FLASH_LITE],
  temperature: 1,
  enableMultiTurnConversation: role === 'admin' || role === 'guest',
  enableThinking: role === 'admin',
  thinkingBudget: 512,
});
