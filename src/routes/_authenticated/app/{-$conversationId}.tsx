import { createFileRoute } from '@tanstack/react-router';
import { App } from '../../../components/app.tsx';
import { LoadingSpinner } from '../../../components/loading-spinner.tsx';
import { conversationsQueryOptions } from '../../../data/conversations/conversations-functions.ts';

export const Route = createFileRoute('/_authenticated/app/{-$conversationId}')({
  loader: async ({ context }) => {
    const { queryClient, currentUserUid } = context;

    return queryClient.ensureQueryData(
      conversationsQueryOptions(currentUserUid),
    );
  },

  pendingComponent: LoadingSpinner,

  component: RouteComponent,
});

function RouteComponent() {
  const { conversationId } = Route.useParams();

  return <App conversationId={conversationId} />;
}
