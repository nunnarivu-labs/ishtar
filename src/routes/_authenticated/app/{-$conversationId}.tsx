import { createFileRoute, redirect } from '@tanstack/react-router';
import { App } from '../../../components/app.tsx';
import { LoadingSpinner } from '../../../components/loading-spinner.tsx';
import { conversationQueryOptions } from '../../../data/conversations/conversations-query-options.ts';

export const Route = createFileRoute('/_authenticated/app/{-$conversationId}')({
  loader: async ({
    context: { queryClient, currentUserUid },
    params: { conversationId },
  }) => {
    if (!conversationId) return null;

    try {
      return await queryClient.fetchQuery(
        conversationQueryOptions(currentUserUid, conversationId),
      );
    } catch {
      throw redirect({
        to: '/app/{-$conversationId}',
        params: { conversationId: undefined },
      });
    }
  },

  pendingComponent: LoadingSpinner,

  component: RouteComponent,
});

function RouteComponent() {
  return <App />;
}
