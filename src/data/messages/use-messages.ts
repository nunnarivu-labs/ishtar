import { Route } from '../../routes/_authenticated/app/{-$conversationId}.tsx';
import {
  type InfiniteData,
  useInfiniteQuery,
  type UseInfiniteQueryResult,
  useMutation,
  type UseMutationResult,
} from '@tanstack/react-query';
import {
  type Cursor,
  fetchMessage,
  fetchMessages,
  type MessagePage,
} from './messages-functions.ts';
import { useCallback, useMemo, useRef } from 'react';
import {
  useNavigate,
  useRouteContext,
  useRouter,
} from '@tanstack/react-router';
import type { LocalFileContent, Message } from '@ishtar/commons/types';
import { AiFailureError } from '../../errors/ai-failure-error.ts';
import {
  conversationQueryKey,
  conversationsQueryKey,
} from '../conversations/conversations-query-keys.ts';
import { useProcessPromptSubmit } from './use-process-prompt-submit.ts';
import type { UserPrompt } from '../../types/user-prompt.ts';

const TEMP_PROMPT_ID = 'prompt_id';

type UseMessagesProps = {
  onMutate: () => void;
  onError: (userPrompt: UserPrompt) => void;
};

type UseMessagesResult = {
  messages: Message[];
  status: UseInfiniteQueryResult['status'];
  mutationStatus: UseMutationResult['status'];
  hasPreviousPage: UseInfiniteQueryResult['hasPreviousPage'];
  isFetchingPreviousPage: UseInfiniteQueryResult['isFetchingPreviousPage'];
  fetchPreviousPage: UseInfiniteQueryResult['fetchPreviousPage'];
  mutate: (prompt: string, files: File[]) => void;
};

export const useMessages = ({
  onMutate,
  onError,
}: UseMessagesProps): UseMessagesResult => {
  const { conversationId: currentConversationId } = Route.useParams();
  const navigate = useNavigate();

  const { queryClient, currentUserUid } = useRouteContext({
    from: '/_authenticated',
  });

  const router = useRouter();

  const { processPromptSubmit } = useProcessPromptSubmit();

  const messagesQuery = useMemo(
    () => [currentUserUid, 'messages', currentConversationId],
    [currentConversationId, currentUserUid],
  );

  const objectUrls = useRef<string[]>([]);

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
  });

  const messages = useMemo(() => value ?? [], [value]);

  const setQueryData = useCallback(
    (getUpdatedMessages: (currentMessages: Message[]) => Message[]) => {
      queryClient.setQueryData<InfiniteData<MessagePage>>(
        messagesQuery,
        (oldData) => {
          if (!oldData || oldData.pages.length === 0) {
            return { pages: [], pageParams: [undefined] };
          }

          const newPages = [...oldData.pages];
          const lastPageIndex = newPages.length - 1;
          const lastPage = newPages[lastPageIndex];

          const messages = getUpdatedMessages(lastPage.messages);

          newPages[lastPageIndex] = {
            ...lastPage,
            messages,
          };

          return { ...oldData, pages: newPages };
        },
      );
    },
    [messagesQuery, queryClient],
  );

  const messageUpdateMutation = useMutation({
    mutationFn: processPromptSubmit,
    onMutate: (data) => {
      if (currentConversationId) {
        setQueryData((existingMessages) => [
          ...existingMessages,
          {
            id: TEMP_PROMPT_ID,
            contents: [
              ...data.files.map(
                (file): LocalFileContent => ({ type: 'localFile', file }),
              ),
              { type: 'text', text: data.prompt },
            ],
            role: 'user',
            tokenCount: null,
            isSummary: false,
            timestamp: new Date(),
          },
        ]);
      }

      onMutate();
    },

    onSuccess: async (data) => {
      if (!currentConversationId) return;

      const { promptMessageId, modelMessageId } = data;

      const [promptMessage, modelMessage] = await Promise.all([
        fetchMessage({
          currentUserUid,
          conversationId: currentConversationId,
          messageId: promptMessageId,
        }),
        fetchMessage({
          currentUserUid,
          conversationId: currentConversationId,
          messageId: modelMessageId,
        }),
      ]);

      setQueryData((existingMessages) => [
        ...existingMessages.filter((message) => message.id !== TEMP_PROMPT_ID),
        promptMessage,
        modelMessage,
      ]);
    },

    onError: async (error: AiFailureError, variables) => {
      if (currentConversationId) {
        const promptMessage = error.promptMessageId
          ? await fetchMessage({
              currentUserUid,
              conversationId: currentConversationId,
              messageId: error.promptMessageId,
            })
          : undefined;

        setQueryData((existingMessages) => {
          const messages = existingMessages.filter(
            (message) => message.id !== TEMP_PROMPT_ID,
          );

          if (promptMessage) {
            messages.push(promptMessage);
          }

          return messages;
        });
      }

      onError(variables);
    },

    onSettled: async (data, error) => {
      if (currentConversationId) {
        objectUrls.current.forEach((url) => URL.revokeObjectURL(url));

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: conversationQueryKey(
              currentUserUid,
              currentConversationId,
            ),
          }),
          router.invalidate(),
        ]);
      } else {
        const conversationId = data?.conversationId || error?.conversationId;

        if (conversationId) {
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: conversationsQueryKey(currentUserUid),
            }),
            await navigate({
              to: '/app/{-$conversationId}',
              params: { conversationId },
            }),
          ]);
        }
      }
    },
  });

  const fetchPreviousPage = useCallback(
    async () => await doFetchPreviousPage(),
    [doFetchPreviousPage],
  );

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
