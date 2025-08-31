import { Route } from '../../routes/_authenticated/app/{-$conversationId}.tsx';
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  type Cursor,
  fetchMessages,
  type MessagePage,
  persistMessage,
} from './messages-functions.ts';
import { type RefObject, useCallback, useMemo } from 'react';
import { getAiResponse as callAi } from '../../ai.ts';
import type { InputFieldRef } from '../../components/input-field.tsx';
import { useNavigate, useRouteContext } from '@tanstack/react-router';
import { useConversations } from '../conversations/use-conversations.ts';
import type {
  AiResponse,
  Content,
  DraftMessage,
  Message,
} from '@ishtar/commons/types';
import { isAllowedType, isDocument, isImage } from '../../utilities/file.ts';
import { useNewConversation } from '../conversations/use-new-conversation.ts';
import { AiFailureError } from '../../errors/ai-failure-error.ts';

const TEMP_PROMPT_ID = 'prompt_id';

type UseMessagesProps = {
  inputFieldRef: RefObject<InputFieldRef | null>;
  onTokenCountUpdate: (
    inputTokenCount: number,
    outputTokenCount: number,
  ) => void;
};

type UseMessagesResult = {
  messages: Message[];
  status: 'error' | 'success' | 'pending';
  mutationStatus: 'idle' | 'pending' | 'error' | 'success';
  hasPreviousPage: boolean;
  isFetchingPreviousPage: boolean;
  fetchPreviousPage: () => Promise<void>;
  mutate: (prompt: string, files: File[]) => void;
};

export const useMessages = ({
  inputFieldRef,
  onTokenCountUpdate,
}: UseMessagesProps): UseMessagesResult => {
  const { conversationId: currentConversationId } = Route.useParams();
  const navigate = useNavigate();

  const { currentUserUid } = useRouteContext({ from: '/_authenticated' });

  const { persistConversation, fetchConversation } = useConversations();
  const { getNewDefaultConversation } = useNewConversation();

  const queryClient = useQueryClient();

  const messagesQuery = [currentUserUid, 'messages', currentConversationId];

  const {
    data: value,
    status,
    hasPreviousPage,
    isFetchingPreviousPage,
    fetchPreviousPage: doFetchPreviousPage,
  } = useInfiniteQuery({
    queryKey: messagesQuery,
    enabled: !!currentConversationId,
    queryFn: ({ pageParam }) =>
      fetchMessages({
        currentUserUid,
        conversationId: currentConversationId,
        cursor: pageParam,
      }),
    initialPageParam: undefined,
    getPreviousPageParam: (firstPage) => firstPage.nextCursor,
    getNextPageParam: (): Cursor => undefined,
    select: (data) => data.pages.flatMap((page) => page.messages),
    staleTime: Infinity,
  });

  const messages = useMemo(() => value ?? [], [value]);

  const processPromptSubmit = useCallback(
    async ({
      prompt,
      files,
    }: {
      prompt: string;
      files: File[];
    }): Promise<{
      conversationId: string;
      promptMessage: Message;
      response: AiResponse;
    }> => {
      const userContent: Content[] = [];

      if (files.length > 0) {
        files
          .filter((file) => isAllowedType(file.type))
          .forEach((file) => {
            if (isImage(file.type)) {
              userContent.push({
                type: 'image',
                imageUrl: { url: URL.createObjectURL(file) },
              });
            } else if (isDocument(file.type)) {
              userContent.push({
                type: 'text',
                text: 'Extracted PDF Text',
                sourceFileUrl: URL.createObjectURL(file),
              });
            }
          });
      }

      userContent.push({ type: 'text', text: prompt });

      const conversationId =
        currentConversationId ??
        (await persistConversation(getNewDefaultConversation()));

      let promptMessageId: string;
      let promptMessage: Message;

      try {
        const draftMessage: DraftMessage = {
          role: 'user',
          contents: userContent,
          isSummary: false,
          timestamp: new Date(),
          tokenCount: null,
        };

        promptMessageId = await persistMessage({
          currentUserUid,
          conversationId: conversationId,
          draftMessage,
        });

        promptMessage = { id: promptMessageId, ...draftMessage };
      } catch (error) {
        throw new AiFailureError('Failed while persisting prompt message', {
          conversationId,
          originalError: error,
        });
      }

      let response: AiResponse;

      try {
        response = await callAi({
          promptMessageId: promptMessageId,
          conversationId,
        });
      } catch (error) {
        throw new AiFailureError('Error in the Ai function', {
          conversationId,
          promptMessage,
          originalError: error,
        });
      }

      return { conversationId, promptMessage, response };
    },
    [
      currentConversationId,
      currentUserUid,
      getNewDefaultConversation,
      persistConversation,
    ],
  );

  const messageUpdateMutation = useMutation({
    mutationFn: processPromptSubmit,
    onMutate: (data) => {
      if (!currentConversationId) return;

      queryClient.setQueryData<InfiniteData<MessagePage>>(
        messagesQuery,
        (oldData) => {
          inputFieldRef.current?.setPrompt('');

          if (!oldData || oldData.pages.length === 0) {
            return { pages: [], pageParams: [undefined] };
          }

          const newPages = [...oldData.pages];
          const lastPageIndex = newPages.length - 1;
          const lastPage = newPages[lastPageIndex];

          newPages[lastPageIndex] = {
            ...lastPage,
            messages: [
              ...lastPage.messages,
              {
                id: TEMP_PROMPT_ID,
                contents: [{ type: 'text', text: data.prompt }],
                role: 'user',
                tokenCount: null,
                isSummary: false,
                timestamp: new Date(),
              },
            ],
          };

          return { ...oldData, pages: newPages };
        },
      );
    },

    onSuccess: async (data) => {
      if (currentConversationId) {
        onTokenCountUpdate(
          data.response?.inputTokenCount ?? 0,
          data.response?.outputTokenCount ?? 0,
        );
      }
    },

    onError: async (_: AiFailureError, variables) => {
      inputFieldRef.current?.setPrompt(variables.prompt);
    },

    onSettled: async (data, error) => {
      if (currentConversationId) {
        const promptMessage = data?.promptMessage || error?.promptMessage;

        queryClient.setQueryData<InfiniteData<MessagePage>>(
          messagesQuery,
          (oldData) => {
            if (!oldData || oldData.pages.length === 0) {
              return { pages: [], pageParams: [undefined] };
            }

            const newPages = [...oldData.pages];
            const lastPageIndex = newPages.length - 1;
            const lastPage = newPages[lastPageIndex];

            const messages = [
              ...lastPage.messages.filter(
                (message) => message.id !== TEMP_PROMPT_ID,
              ),
            ];

            if (promptMessage) {
              messages.push(promptMessage);
            }

            if (data?.response && !error) {
              messages.push({
                id: data.response.responseId,
                contents: [{ type: 'text', text: data.response.response }],
                role: 'model',
                tokenCount: null,
                isSummary: false,
                timestamp: new Date(),
              });
            }

            newPages[lastPageIndex] = {
              ...lastPage,
              messages,
            };

            return { ...oldData, pages: newPages };
          },
        );
      } else {
        const conversationId = data?.conversationId || error?.conversationId;

        if (conversationId) {
          await fetchConversation(conversationId);

          await navigate({
            to: '/app/{-$conversationId}',
            params: { conversationId },
          });
        }
      }
    },
  });

  const fetchPreviousPage = useCallback(async () => {
    await doFetchPreviousPage();
  }, [doFetchPreviousPage]);

  const mutate = useCallback(
    (prompt: string, files: File[]) =>
      messageUpdateMutation.mutate({ prompt, files }),
    [messageUpdateMutation],
  );

  return useMemo(
    () => ({
      messages,
      status,
      mutationStatus: messageUpdateMutation.status,
      hasPreviousPage,
      isFetchingPreviousPage,
      fetchPreviousPage,
      mutate,
    }),
    [
      messages,
      fetchPreviousPage,
      hasPreviousPage,
      isFetchingPreviousPage,
      messageUpdateMutation.status,
      mutate,
      status,
    ],
  );
};
