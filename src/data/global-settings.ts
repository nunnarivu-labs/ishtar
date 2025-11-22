import type { GlobalSettings, UserRole } from '@ishtar/commons/types';

export const getGlobalSettings = (role: UserRole): GlobalSettings => ({
  defaultModel: role === 'admin' ? 'gemini-2.5-flash' : 'gemini-2.5-flash-lite',
  supportedModels:
    role === 'admin'
      ? [
          'gemini-2.5-pro',
          'gemini-2.5-flash-image-preview',
          'gemini-2.5-flash',
          'gemini-2.5-flash-lite',
        ]
      : ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
  temperature: 1,
  enableMultiTurnConversation: role === 'admin' || role === 'guest',
  enableThinking: role === 'admin',
  thinkingBudget: 512,
});
