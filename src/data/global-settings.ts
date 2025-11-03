import type { GlobalSettings, UserRole } from '@ishtar/commons/types';

const isAdminOrGuestRole = (role: UserRole) => role === 'admin' || role === 'guest'

export const getGlobalSettings = (role: UserRole): GlobalSettings => ({
  defaultModel: role === 'admin' ? 'gemini-2.5-flash' : 'gemini-2.0-flash-lite',
  supportedModels:
    isAdminOrGuestRole(role)
      ? [
          'gemini-2.5-pro',
          'gemini-2.5-flash-image-preview',
          'gemini-2.5-flash',
          'gemini-2.5-flash-lite',
          'gemini-2.0-flash',
          'gemini-2.0-flash-lite',
        ]
      : ['gemini-2.0-flash', 'gemini-2.0-flash-lite'],
  temperature: 1,
  enableMultiTurnConversation: isAdminOrGuestRole(role),
  enableThinking: role === 'admin',
  thinkingBudget: 512,
});
