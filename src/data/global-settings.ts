import type { GlobalSettings, UserRole } from '@ishtar/commons/types';

export const getGlobalSettings = (role: UserRole): GlobalSettings => ({
  defaultModel: role === 'admin' ? 'gemini-2.5-flash' : 'gemini-2.0-flash-lite',
  supportedModels:
    role === 'admin'
      ? [
          'gemini-2.5-pro',
          'gemini-2.5-flash',
          'gemini-2.5-flash-lite',
          'gemini-2.0-flash',
          'gemini-2.0-flash-lite',
        ]
      : ['gemini-2.0-flash', 'gemini-2.0-flash-lite'],
  temperature: 1,
  enableMultiTurnConversation: role === 'admin',
  enableThinking: role === 'admin',
  thinkingBudget: 512,
});
