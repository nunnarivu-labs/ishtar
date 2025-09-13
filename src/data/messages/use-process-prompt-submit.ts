import type { UserPrompt } from '../../types/user-prompt.ts';
import { useCallback } from 'react';
import type { AiResponse, Content, DraftMessage } from '@ishtar/commons/types';
import { persistConversation } from '../conversations/conversations-functions.ts';
import { persistMessage } from './messages-functions.ts';
import { AiFailureError } from '../../errors/ai-failure-error.ts';
import { getAiResponse as callAi } from '../../ai.ts';
import { useRouteContext } from '@tanstack/react-router';
import { Route } from '../../routes/_authenticated/app/{-$conversationId}.tsx';
import { useNewConversation } from '../conversations/use-new-conversation.ts';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseApp } from '../../firebase.ts';
import { v4 as uuid } from 'uuid';
import { persistFileData } from '../files/file-data-functions.ts';

type UseProcessPromptSubmitResult = {
  processPromptSubmit: (userPrompt: UserPrompt) => Promise<AiResponse>;
};

export const useProcessPromptSubmit = (): UseProcessPromptSubmitResult => {
  const { conversationId: currentConversationId } = Route.useParams();
  const { currentUserUid } = useRouteContext({
    from: '/_authenticated',
  });

  const { getNewDefaultConversation } = useNewConversation();

  const buildUserPrompt = useCallback(
    async ({
      userPrompt,
      conversationId,
    }: {
      userPrompt: UserPrompt;
      conversationId: string;
    }): Promise<Content[]> => {
      const { prompt, files } = userPrompt;

      const userContent: Content[] = [];

      if (files.length > 0) {
        const uploadedFiles: string[] = await Promise.all(
          files.map(async (file) => {
            const storageRef = ref(
              firebaseApp.storage,
              `userFiles/${currentUserUid}/${conversationId}/${uuid()}`,
            );

            const uploadResult = await uploadBytes(storageRef, file, {
              contentType: file.type,
              customMetadata: { originalFileName: file.name },
            });

            const url = await getDownloadURL(storageRef);

            return await persistFileData(
              { currentUserUid, conversationId },
              {
                createdAt: new Date(),
                type: file.type,
                originalFileName: file.name,
                storagePath: uploadResult.ref.fullPath,
                url,
              },
            );
          }),
        );

        uploadedFiles.forEach((fileId) =>
          userContent.push({ type: 'file', fileId }),
        );
      }

      userContent.push({ type: 'text', text: prompt });

      return userContent;
    },
    [currentUserUid],
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
    async (userPrompt: UserPrompt): Promise<AiResponse> => {
      const conversationId = await getConversationIdOrCreate();

      const userContent = await buildUserPrompt({ userPrompt, conversationId });

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
