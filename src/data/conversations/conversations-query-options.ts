import { queryOptions } from '@tanstack/react-query';
import {
  conversationQueryKey,
  conversationsQueryKey,
} from './conversations-query-keys.ts';
import {
  fetchConversation,
  fetchConversations,
} from './conversations-functions.ts';

export const conversationsQueryOptions = (currentUserUid: string) =>
  queryOptions({
    queryKey: conversationsQueryKey(currentUserUid),
    queryFn: () => fetchConversations(currentUserUid),
  });

export const conversationQueryOptions = (
  currentUserUid: string,
  conversationId: string,
) =>
  queryOptions({
    queryKey: conversationQueryKey(currentUserUid, conversationId),
    queryFn: () => fetchConversation({ currentUserUid, conversationId }),
  });
