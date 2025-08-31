import { AppLayout } from './app-layout.tsx';
import { AiContent } from './ai-content.tsx';
import { useEffect, useState } from 'react';
import { ChatSettings } from './chat-settings.tsx';
import { useCurrentConversation } from '../data/conversations/use-current-conversation.ts';
import { Navigate, useLoaderData } from '@tanstack/react-router';
import { useConversations } from '../data/conversations/use-conversations.ts';

type AppProps = {
  conversationId?: string;
};

export const App = ({ conversationId }: AppProps) => {
  const [isSettingsOpen, setSettingsOpen] = useState(false);

  const user = useLoaderData({ from: '/_authenticated' });
  const { conversationsQuery } = useConversations();

  const currentConversation = useCurrentConversation();

  useEffect(() => {
    document.title = user.displayName;
  }, [user.displayName]);

  if (
    conversationsQuery.status === 'success' &&
    conversationId &&
    !currentConversation
  ) {
    return (
      <Navigate
        to={`/app/{-$conversationId}`}
        params={{ conversationId: undefined }}
      />
    );
  }

  return (
    <>
      <AppLayout onSettingsClick={() => setSettingsOpen(true)}>
        <AiContent key={conversationId} />
      </AppLayout>
      <ChatSettings
        key={conversationId}
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
};
