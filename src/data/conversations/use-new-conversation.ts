import { useCallback } from 'react';
import { type DraftConversation, ThinkingMode } from '@ishtar/commons';
import { getGlobalSettings } from '../global-settings.ts';
import { useLoaderData } from '@tanstack/react-router';

type UseNewConversationResult = {
  getNewDefaultConversation: () => DraftConversation;
};

export const useNewConversation = (): UseNewConversationResult => {
  const currentUser = useLoaderData({ from: '/_authenticated' });
  const globalSettings = getGlobalSettings(currentUser.role);

  const getNewDefaultConversation = useCallback(() => {
    const now = Date.now();
    const date = new Date(now);

    const defaultModelConfig =
      globalSettings.models[globalSettings.defaultModelId];
    const thinkingConfig = defaultModelConfig.capabilities.thinking;

    const newConversation: DraftConversation = {
      createdAt: date,
      lastUpdated: date,
      isDeleted: false,
      title: `New Chat - ${now}`,
      summarizedMessageId: null,
      textTokenCountSinceLastSummary: 0,
      inputTokenCount: 0,
      outputTokenCount: 0,
      chatSettings: {
        model: globalSettings.defaultModelId,
        temperature: globalSettings.temperature,
        systemInstruction: null,
        enableMultiTurnConversation: defaultModelConfig.capabilities.multiTurn,
        enableThinking: thinkingConfig.mode !== 'disabled',
        thinkingCapacity:
          thinkingConfig.mode !== ThinkingMode.DISABLED
            ? thinkingConfig.defaultBudget
            : null,
      },
    };

    return newConversation;
  }, [
    globalSettings.defaultModelId,
    globalSettings.models,
    globalSettings.temperature,
  ]);

  return { getNewDefaultConversation };
};
