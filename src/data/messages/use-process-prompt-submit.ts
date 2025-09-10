import type { PromptToSubmit } from '../../types/prompt-to-submit.ts';
import { useCallback } from 'react';
import type { AiResponse, Content, DraftMessage } from '@ishtar/commons/types';
import { isAllowedType, isDocument, isImage } from '../../utilities/file.ts';
import { persistConversation } from '../conversations/conversations-functions.ts';
import { persistMessage } from './messages-functions.ts';
import { AiFailureError } from '../../errors/ai-failure-error.ts';
import { getAiResponse as callAi } from '../../ai.ts';
import { useRouteContext } from '@tanstack/react-router';
import { Route } from '../../routes/_authenticated/app/{-$conversationId}.tsx';
import { useNewConversation } from '../conversations/use-new-conversation.ts';

type UseProcessPromptSubmitResult = {
  processPromptSubmit: (promptToSubmit: PromptToSubmit) => Promise<AiResponse>;
};

export const useProcessPromptSubmit = (): UseProcessPromptSubmitResult => {
  const { conversationId: currentConversationId } = Route.useParams();
  const { currentUserUid } = useRouteContext({
    from: '/_authenticated',
  });

  const { getNewDefaultConversation } = useNewConversation();

  const buildUserPrompt = useCallback(
    ({ prompt, files }: PromptToSubmit): Content[] => {
      const userContent: Content[] = [];

      if (files.length > 0) {
        files
          .filter((file) => isAllowedType(file.type))
          .forEach((file) => {
            const url = URL.createObjectURL(file);

            if (isImage(file.type)) {
              userContent.push({
                type: 'image',
                imageUrl: { url },
              });
            } else if (isDocument(file.type)) {
              userContent.push({
                type: 'document',
                documentUrl: { url },
              });
            }

            URL.revokeObjectURL(url);
          });
      }

      userContent.push({ type: 'text', text: prompt });

      return userContent;
    },
    [],
  );

  const getConversationIdOrCreate = useCallback(
    async (): Promise<string> =>
      currentConversationId ??
      (await persistConversation({
        currentUserUid,
        draftConversation: getNewDefaultConversation(),
      })),
    [currentConversationId, currentUserUid, getNewDefaultConversation],
  );

  const persistUserPrompt = useCallback(
    async ({
      contents,
      conversationId,
    }: {
      contents: Content[];
      conversationId: string;
    }): Promise<string> => {
      try {
        const draftMessage: DraftMessage = {
          role: 'user',
          contents,
          isSummary: false,
          timestamp: new Date(),
          tokenCount: null,
        };

        return await persistMessage({
          currentUserUid,
          conversationId: conversationId,
          draftMessage,
        });
      } catch (error) {
        throw new AiFailureError('Failed while persisting prompt message', {
          conversationId,
          originalError: error,
        });
      }
    },
    [currentUserUid],
  );

  const getAiResponse = useCallback(
    async ({
      promptMessageId,
      conversationId,
    }: {
      promptMessageId: string;
      conversationId: string;
    }): Promise<AiResponse> => {
      try {
        return await callAi({
          promptMessageId,
          conversationId,
        });
      } catch (error) {
        throw new AiFailureError('Error in the Ai function', {
          conversationId,
          promptMessageId,
          originalError: error,
        });
      }
    },
    [],
  );

  const processPromptSubmit = useCallback(
    async (promptToSubmit: PromptToSubmit): Promise<AiResponse> => {
      const userContent = buildUserPrompt(promptToSubmit);

      const conversationId = await getConversationIdOrCreate();

      const promptMessageId = await persistUserPrompt({
        contents: userContent,
        conversationId,
      });

      return getAiResponse({ promptMessageId, conversationId });
    },
    [
      buildUserPrompt,
      getAiResponse,
      getConversationIdOrCreate,
      persistUserPrompt,
    ],
  );

  return { processPromptSubmit };
};
