import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { LoadingSpinner } from '../../components/loading-spinner.tsx';
import { fetchCurrentUser } from '../../data/current-user/current-user-functions.ts';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    const { auth } = context;

    if (!auth.isAuthenticated) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }

    return { currentUserUid: auth.currentUserUid };
  },

  loader: async ({ context }) => {
    const { queryClient, currentUserUid } = context;

    return await queryClient.ensureQueryData({
      queryKey: ['user', currentUserUid],
      queryFn: () => fetchCurrentUser(currentUserUid),
    });
  },

  pendingComponent: LoadingSpinner,

  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
