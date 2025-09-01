import { useQuery } from '@tanstack/react-query';
import { conversationsQueryOptions } from './conversations-query-options.ts';
import { useRouteContext } from '@tanstack/react-router';

export const useConversationsQuery = () =>
  useQuery(
    conversationsQueryOptions(
      useRouteContext({ from: '/_authenticated' }).currentUserUid,
    ),
  );
